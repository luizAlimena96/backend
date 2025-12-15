import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CrmTemplatesService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        return this.prisma.cRMTemplate.findMany({
            where: {
                OR: [
                    { organizationId },
                    { isPublic: true },
                ],
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async create(data: any) {
        // Get the CRM config to copy its settings
        const crmConfig = await this.prisma.cRMConfig.findUnique({
            where: { id: data.crmConfigId },
            include: { automations: true },
        });

        if (!crmConfig) {
            throw new NotFoundException('CRM config not found');
        }

        return this.prisma.cRMTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                crmType: crmConfig.crmType,
                baseUrl: crmConfig.baseUrl,
                authType: crmConfig.authType,
                automations: crmConfig.automations,
                organizationId: data.organizationId,
                isPublic: data.isPublic ?? false,
            },
        });
    }

    async instantiate(templateId: string, data: any) {
        const template = await this.prisma.cRMTemplate.findUnique({
            where: { id: templateId },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        // Create a new CRM config from the template
        const newConfig = await this.prisma.cRMConfig.create({
            data: {
                name: data.name,
                crmType: template.crmType,
                baseUrl: template.baseUrl,
                authType: template.authType,
                apiKey: data.apiKey,
                organizationId: data.organizationId,
                isActive: true,
            },
        });

        // Create automations from template
        if (template.automations && Array.isArray(template.automations)) {
            for (const automation of template.automations as any[]) {
                await this.prisma.cRMAutomation.create({
                    data: {
                        name: automation.name,
                        crmConfigId: newConfig.id,
                        crmStageId: automation.crmStageId,
                        actions: automation.actions,
                        isActive: true,
                        triggerType: automation.triggerType || 'STATE_CHANGE',
                    },
                });
            }
        }

        return newConfig;
    }

    async delete(id: string, organizationId: string) {
        const template = await this.prisma.cRMTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            throw new NotFoundException('Template not found');
        }

        if (template.organizationId !== organizationId) {
            throw new ForbiddenException('Access denied');
        }

        return this.prisma.cRMTemplate.delete({
            where: { id },
        });
    }
}
