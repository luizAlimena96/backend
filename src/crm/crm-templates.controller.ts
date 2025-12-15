import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

@Controller('crm-templates')
@UseGuards(JwtAuthGuard)
export class CRMTemplatesController {
    constructor(private prisma: PrismaService) { }

    @Get()
    async findAll(@Query('organizationId') organizationId: string) {
        return this.prisma.cRMTemplate.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
    }

    @Post()
    async create(@Body() data: {
        name: string;
        description?: string;
        crmConfigId: string;
        organizationId: string;
    }) {
        const crmConfig = await this.prisma.cRMConfig.findUnique({
            where: { id: data.crmConfigId },
            include: {
                automations: true,
            },
        });

        if (!crmConfig) {
            throw new Error('CRM Config not found');
        }

        return this.prisma.cRMTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                organizationId: data.organizationId,
                crmType: crmConfig.crmType,
                baseUrl: crmConfig.baseUrl,
                authType: crmConfig.authType,
                automations: crmConfig.automations || [],
                isPublic: false,
            },
        });
    }

    @Post(':id/instantiate')
    async instantiate(
        @Param('id') id: string,
        @Body() data: {
            organizationId: string;
            name: string;
            apiKey: string;
        }
    ) {
        const template = await this.prisma.cRMTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            throw new Error('Template not found');
        }

        const newConfig = await this.prisma.cRMConfig.create({
            data: {
                name: data.name,
                organizationId: data.organizationId,
                crmType: template.crmType,
                baseUrl: template.baseUrl,
                authType: template.authType,
                apiKey: data.apiKey,
                isActive: true,
            },
        });

        const automations = template.automations as any;
        if (automations && Array.isArray(automations)) {
            for (const automation of automations) {
                await this.prisma.cRMAutomation.create({
                    data: {
                        crmConfigId: newConfig.id,
                        name: automation.name,
                        triggerType: automation.triggerType || 'STATE_CHANGE',
                        actions: automation.actions,
                        isActive: automation.isActive ?? true,
                    },
                });
            }
        }

        return newConfig;
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        return this.prisma.cRMTemplate.delete({
            where: { id },
        });
    }
}
