import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CrmAutomationsService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        const configs = await this.prisma.cRMConfig.findMany({
            where: { organizationId },
            select: { id: true },
        });

        const configIds = configs.map(c => c.id);

        return this.prisma.cRMAutomation.findMany({
            where: {
                crmConfigId: { in: configIds },
            },
            include: {
                crmConfig: true,
                crmStage: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const automation = await this.prisma.cRMAutomation.findUnique({
            where: { id },
            include: {
                crmConfig: true,
                crmStage: true,
            },
        });

        if (!automation) {
            throw new NotFoundException('Automation not found');
        }

        // Verify ownership through crmConfig
        if (automation.crmConfig.organizationId !== organizationId) {
            throw new ForbiddenException('Access denied');
        }

        return automation;
    }

    async create(data: any, organizationId: string) {
        // Verify CRM config ownership
        const crmConfig = await this.prisma.cRMConfig.findUnique({
            where: { id: data.crmConfigId },
        });

        if (!crmConfig || crmConfig.organizationId !== organizationId) {
            throw new ForbiddenException('Access denied');
        }

        return this.prisma.cRMAutomation.create({
            data: {
                name: data.name,
                crmConfigId: data.crmConfigId,
                crmStageId: data.crmStageId,
                agentStateId: data.agentStateId,
                actions: data.actions,
                isActive: data.isActive ?? true,
                description: data.description,
                triggerType: data.triggerType || 'STATE_CHANGE',
                delayMinutes: data.delayMinutes,
                order: data.order ?? 0,
            },
            include: {
                crmConfig: true,
                crmStage: true,
            },
        });
    }

    async update(id: string, data: any, organizationId: string) {
        // Verify ownership
        await this.findOne(id, organizationId);

        return this.prisma.cRMAutomation.update({
            where: { id },
            data: {
                name: data.name,
                crmStageId: data.crmStageId,
                agentStateId: data.agentStateId,
                actions: data.actions,
                isActive: data.isActive,
                description: data.description,
                triggerType: data.triggerType,
                delayMinutes: data.delayMinutes,
                order: data.order,
            },
            include: {
                crmConfig: true,
                crmStage: true,
            },
        });
    }

    async delete(id: string, organizationId: string) {
        // Verify ownership
        await this.findOne(id, organizationId);

        return this.prisma.cRMAutomation.delete({
            where: { id },
        });
    }
}
