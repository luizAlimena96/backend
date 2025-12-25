import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface CreateTemplateDto {
    name: string;
    category: string;
    language?: string;
    headerType?: string;
    headerContent?: string;
    bodyText: string;
    footerText?: string;
    buttons?: any;
}

interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
    status?: string;
    metaTemplateId?: string;
}

@Injectable()
export class TemplatesService {
    private readonly graphApiUrl = 'https://graph.facebook.com/v24.0';

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
    ) { }

    /**
     * List all templates for an organization
     */
    async listTemplates(organizationId: string) {
        return this.prisma.whatsAppTemplate.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get a single template
     */
    async getTemplate(organizationId: string, templateId: string) {
        const template = await this.prisma.whatsAppTemplate.findFirst({
            where: {
                id: templateId,
                organizationId,
            },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        return template;
    }

    /**
     * Create a new template
     */
    async createTemplate(organizationId: string, createDto: CreateTemplateDto) {
        // Check if template with same name exists
        const existing = await this.prisma.whatsAppTemplate.findUnique({
            where: {
                organizationId_name: {
                    organizationId,
                    name: createDto.name,
                },
            },
        });

        if (existing) {
            throw new ConflictException('Template with this name already exists');
        }

        return this.prisma.whatsAppTemplate.create({
            data: {
                organizationId,
                name: createDto.name,
                category: createDto.category,
                language: createDto.language || 'pt_BR',
                headerType: createDto.headerType,
                headerContent: createDto.headerContent,
                bodyText: createDto.bodyText,
                footerText: createDto.footerText,
                buttons: createDto.buttons,
                status: 'PENDING',
            },
        });
    }

    /**
     * Update a template
     */
    async updateTemplate(
        organizationId: string,
        templateId: string,
        updateDto: UpdateTemplateDto,
    ) {
        const template = await this.getTemplate(organizationId, templateId);

        // Don't allow updating approved templates (they're already submitted to Meta)
        if (template.status === 'APPROVED' && updateDto.bodyText) {
            throw new ConflictException('Cannot modify body of approved template. Create a new version instead.');
        }

        return this.prisma.whatsAppTemplate.update({
            where: { id: templateId },
            data: {
                ...updateDto,
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Delete a template
     */
    async deleteTemplate(organizationId: string, templateId: string) {
        await this.getTemplate(organizationId, templateId);

        await this.prisma.whatsAppTemplate.delete({
            where: { id: templateId },
        });
    }

    /**
     * Sync templates with Meta (fetch approved templates from WhatsApp Business Account)
     */
    async syncTemplatesWithMeta(organizationId: string) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                whatsappWabaId: true,
                whatsappCloudAccessToken: true,
            },
        });

        if (!organization?.whatsappWabaId || !organization?.whatsappCloudAccessToken) {
            throw new ConflictException('WhatsApp Cloud API not configured for this organization');
        }

        try {
            // Fetch templates from Meta
            const url = `${this.graphApiUrl}/${organization.whatsappWabaId}/message_templates`;
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    params: {
                        access_token: organization.whatsappCloudAccessToken,
                        fields: 'name,category,language,status,components',
                    },
                    timeout: 30000,
                }),
            );

            const metaTemplates = response.data.data || [];
            const syncedTemplates: string[] = [];

            for (const metaTemplate of metaTemplates) {
                // Parse template components
                const headerComponent = metaTemplate.components?.find((c: any) => c.type === 'HEADER');
                const bodyComponent = metaTemplate.components?.find((c: any) => c.type === 'BODY');
                const footerComponent = metaTemplate.components?.find((c: any) => c.type === 'FOOTER');
                const buttonsComponent = metaTemplate.components?.find((c: any) => c.type === 'BUTTONS');

                // Upsert template in database
                await this.prisma.whatsAppTemplate.upsert({
                    where: {
                        organizationId_name: {
                            organizationId,
                            name: metaTemplate.name,
                        },
                    },
                    update: {
                        status: metaTemplate.status,
                        category: metaTemplate.category,
                        language: metaTemplate.language,
                        headerType: headerComponent?.format,
                        headerContent: headerComponent?.text || headerComponent?.example?.header_handle?.[0],
                        bodyText: bodyComponent?.text || '',
                        footerText: footerComponent?.text,
                        buttons: buttonsComponent?.buttons,
                        metaTemplateId: metaTemplate.id,
                        updatedAt: new Date(),
                    },
                    create: {
                        organizationId,
                        name: metaTemplate.name,
                        status: metaTemplate.status,
                        category: metaTemplate.category,
                        language: metaTemplate.language,
                        headerType: headerComponent?.format,
                        headerContent: headerComponent?.text,
                        bodyText: bodyComponent?.text || '',
                        footerText: footerComponent?.text,
                        buttons: buttonsComponent?.buttons,
                        metaTemplateId: metaTemplate.id,
                    },
                });

                syncedTemplates.push(metaTemplate.name);
            }

            return {
                success: true,
                syncedCount: syncedTemplates.length,
                templates: syncedTemplates,
            };
        } catch (error: any) {
            console.error('[Templates] Error syncing with Meta:', error.response?.data || error.message);
            throw new Error(`Failed to sync templates: ${error.message}`);
        }
    }

    /**
     * Submit template to Meta for approval
     */
    async submitTemplateToMeta(organizationId: string, templateId: string) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                whatsappWabaId: true,
                whatsappCloudAccessToken: true,
            },
        });

        if (!organization?.whatsappWabaId || !organization?.whatsappCloudAccessToken) {
            throw new ConflictException('WhatsApp Cloud API not configured');
        }

        const template = await this.getTemplate(organizationId, templateId);

        try {
            const url = `${this.graphApiUrl}/${organization.whatsappWabaId}/message_templates`;

            // Build components array
            const components: any[] = [];

            // Header component
            if (template.headerType && template.headerType !== 'NONE') {
                if (template.headerType === 'TEXT') {
                    components.push({
                        type: 'HEADER',
                        format: 'TEXT',
                        text: template.headerContent,
                    });
                } else {
                    components.push({
                        type: 'HEADER',
                        format: template.headerType,
                        example: { header_handle: [template.headerContent] },
                    });
                }
            }

            // Body component
            components.push({
                type: 'BODY',
                text: template.bodyText,
            });

            // Footer component
            if (template.footerText) {
                components.push({
                    type: 'FOOTER',
                    text: template.footerText,
                });
            }

            // Buttons
            if (template.buttons) {
                components.push({
                    type: 'BUTTONS',
                    buttons: template.buttons,
                });
            }

            const payload = {
                name: template.name,
                category: template.category,
                language: template.language,
                components,
            };

            const response = await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${organization.whatsappCloudAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }),
            );

            // Update template with Meta ID and status
            await this.prisma.whatsAppTemplate.update({
                where: { id: templateId },
                data: {
                    metaTemplateId: response.data.id,
                    status: 'PENDING',
                },
            });

            return {
                success: true,
                metaTemplateId: response.data.id,
            };
        } catch (error: any) {
            console.error('[Templates] Error submitting to Meta:', error.response?.data || error.message);
            throw new Error(`Failed to submit template: ${error.response?.data?.error?.message || error.message}`);
        }
    }
}
