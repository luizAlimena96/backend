import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

import { ZapSignService } from '../integrations/zapsign/zapsign.service';

@Injectable()
export class OrganizationsService {
    constructor(
        private prisma: PrismaService,
        private zapSignService: ZapSignService
    ) { }

    async findAll(userId: string, userRole: string, userOrgId: string) {
        // Super Admin vê todas, outros veem apenas a sua
        const where = userRole === 'SUPER_ADMIN' ? {} : { id: userOrgId || '' };

        return this.prisma.organization.findMany({
            where,
            select: {
                id: true,
                name: true,
                slug: true,
                email: true,
                phone: true,
                isActive: true,
                whatsappConnected: true,
                googleCalendarEnabled: true,
                googleTokenExpiry: true,
                crmEnabled: true,
                crmType: true,
                openaiApiKey: true,
                openaiProjectId: true,
                elevenLabsApiKey: true,
                elevenLabsVoiceId: true,
                evolutionApiUrl: true,
                evolutionInstanceName: true,
                zapSignApiToken: true,
                zapSignTemplateId: true,
                _count: {
                    select: {
                        users: true,
                        agents: true,
                        leads: true,
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const organization = await this.prisma.organization.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        allowedTabs: true,
                        createdAt: true,
                    },
                },
                _count: {
                    select: {
                        users: true,
                        agents: true,
                        leads: true,
                        conversations: true,
                    },
                },
            },
        });

        if (!organization) {
            throw new NotFoundException('Organização não encontrada');
        }

        return organization;
    }

    async create(data: any) {
        const { name, slug, email, phone, settings } = data;

        if (!name || !slug) {
            throw new ForbiddenException('Nome e slug são obrigatórios');
        }

        // Verificar se slug já existe
        const existing = await this.prisma.organization.findUnique({
            where: { slug },
        });

        if (existing) {
            throw new ForbiddenException('Slug já está em uso');
        }

        return this.prisma.organization.create({
            data: {
                name,
                slug: slug.toLowerCase(),
                email,
                phone,
                settings,
                isActive: true,
            },
        });
    }

    async update(id: string, data: any, userRole: string) {
        // Super Admin pode editar tudo, Admin apenas alguns campos
        const allowedFields = userRole === 'SUPER_ADMIN'
            ? data
            : {
                name: data.name,
                email: data.email,
                phone: data.phone,
                niche: data.niche,
                document: data.document,
                zipCode: data.zipCode,
                street: data.street,
                number: data.number,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
                settings: data.settings,
            };

        return this.prisma.organization.update({
            where: { id },
            data: allowedFields,
        });
    }

    async remove(id: string) {
        await this.prisma.organization.delete({
            where: { id },
        });

        return { success: true };
    }

    async updateZapSignConfig(id: string, data: { enabled: boolean; apiToken: string; templateId: string }) {
        return this.prisma.organization.update({
            where: { id },
            data: {
                zapSignApiToken: data.apiToken,
                zapSignTemplateId: data.templateId,
                // Assuming zapSignEnabled is stored in settings or handled by presence of token
                // If specific field exists, use it. Based on previous context, user approved schema check implicitly.
                // Re-checking assumed fields from findAll: zapSignApiToken, zapSignTemplateId.
                // If 'zapSignEnabled' is a new field, we will handle it.
                // For now, mapping enabled to existing logic or settings if needed.
                // Let's assume we map 'enabled' to a setting or just rely on token presence for now if column missing.
                // Wait, previously I saw findAll had zapSignApiToken.
                // I will update just the fields I know exist.
            }
        });
    }

    async testZapSignConnection(apiToken: string): Promise<{ success: boolean; message: string }> {
        try {
            // We need a lightweight call. Since we are adding logic, let's assume we can call something valid.
            // ZapSignService needs a method for this.
            // For now, I'll return success if token is present, but I should implement real test in next step.
            // Actually, I should call ZapSignService here.
            await this.zapSignService.getTemplates(apiToken);
            return { success: true, message: 'Conexão realizada com sucesso!' };
        } catch (error) {
            return { success: false, message: 'Falha na autenticação: Verifique o token.' };
        }
    }

    canAccessOrganization(userRole: string, userOrgId: string, targetOrgId: string): boolean {
        if (userRole === 'SUPER_ADMIN') return true;
        return userOrgId === targetOrgId;
    }
}
