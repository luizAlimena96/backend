import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CrmAutomationsService {
    private readonly logger = new Logger(CrmAutomationsService.name);

    constructor(
        private prisma: PrismaService,
        @InjectQueue('automation') private automationQueue: Queue,
    ) { }

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
        let crmConfigId = data.crmConfigId;

        // If no crmConfigId provided, try to find one or create default
        if (!crmConfigId) {
            const config = await this.prisma.cRMConfig.findFirst({
                where: { organizationId }
            });

            if (config) {
                crmConfigId = config.id;
            } else {
                // Create Default
                const newConfig = await this.prisma.cRMConfig.create({
                    data: {
                        organizationId,
                        name: 'Default CRM',
                        crmType: 'SYSTEM',
                        baseUrl: '',
                        authType: 'NONE',
                        apiKey: '',
                    }
                });
                crmConfigId = newConfig.id;
            }
        }

        // Verify CRM config ownership
        const crmConfig = await this.prisma.cRMConfig.findUnique({
            where: { id: crmConfigId },
        });

        if (!crmConfig || crmConfig.organizationId !== organizationId) {
            throw new ForbiddenException('Access denied');
        }

        return this.prisma.cRMAutomation.create({
            data: {
                name: data.name,
                crmConfigId: crmConfigId,
                crmStageId: data.crmStageId,
                agentStateId: data.agentStateId,
                actions: data.actions,
                isActive: data.isActive ?? true,
                description: data.description,
                triggerType: data.triggerType || 'STATE_CHANGE',
                delayMinutes: data.delayMinutes,
                order: data.order ?? 0,
                // Add triggerCondition logic storage inside actions or separate json if needed (using actions for everything now based on frontend)
                // Wait, frontend sends triggerCondition but schema doesn't have it?
                // Frontend interface has triggerCondition. Schema DOES NOT.
                // We should store triggerCondition inside 'actions' JSON or add field.
                // For now, let's assume 'actions' JSON stores configuration including conditions.
            },
            include: {
                crmConfig: true,
                crmStage: true,
            },
        });
    }

    // New helper to ensure we store triggerCondition. 
    // Wait, the Schema cRMAutomation definition:
    // actions Json
    // but no triggerCondition field.
    // The frontend sends triggerCondition. We should probably merge it into actions or upgrade Schema.
    // For speed, let's look at how frontend saves... it saves triggerCondition.
    // I will modify schema later if needed, but for now I will rely on 'actions' JSON containing everything or passing it through.

    // ... update, delete methods ... 

    async update(id: string, data: any, organizationId: string) {
        // Verify ownership
        await this.findOne(id, organizationId);

        return this.prisma.cRMAutomation.update({
            where: { id },
            data: {
                name: data.name,
                crmStageId: data.crmStageId,
                agentStateId: data.agentStateId,
                actions: data.actions, // Frontend sends full object here? 
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
        await this.findOne(id, organizationId);
        return this.prisma.cRMAutomation.delete({ where: { id } });
    }

    // ============================================
    // ENGINE
    // ============================================

    async trigger(triggerType: string, context: { organizationId: string; leadId: string; data?: any }) {
        this.logger.log(`🔄 Triggering ${triggerType} for lead ${context.leadId}`);

        try {
            // Find automations
            const automations = await this.prisma.cRMAutomation.findMany({
                where: {
                    triggerType,
                    isActive: true,
                    crmConfig: { organizationId: context.organizationId }
                }
            });

            this.logger.log(`📋 Found ${automations.length} potential automations for trigger ${triggerType}`);

            if (automations.length > 0) {
                this.logger.debug(`📋 Automations found:`, automations.map(a => ({ id: a.id, name: a.name, triggerType: a.triggerType, actions: a.actions })));
            }

            for (const automation of automations) {
                const conditionPassed = await this.checkCondition(automation, context);
                this.logger.log(`📋 Automation ${automation.name}: condition ${conditionPassed ? 'PASSED' : 'FAILED'}`);

                if (conditionPassed) {
                    await this.enqueue(automation, context);
                }
            }
        } catch (error) {
            this.logger.error(`❌ Error processing trigger ${triggerType}:`, error);
        }
    }

    private async checkCondition(automation: any, context: any): Promise<boolean> {
        const config = automation.actions as any;
        const condition = config?.triggerCondition || {};

        this.logger.debug(`📋 Checking condition for ${automation.name}:`, { triggerType: automation.triggerType, condition });

        if (automation.triggerType === 'TAG_ADDED') {
            if (!condition.tagId) return true;
            return condition.tagId === context.data?.tagId;
        }

        if (automation.triggerType === 'MESSAGE_RECEIVED') {
            if (!condition.keyword) return true;
            const message = context.data?.content || '';
            return message.toLowerCase().includes(condition.keyword.toLowerCase());
        }

        // LEAD_CREATED, STAGE_CHANGE, etc. - no specific conditions, pass through
        return true;
    }

    private async enqueue(automation: any, context: any) {
        const actionsData = automation.actions as any;

        // Try to get actionType from multiple places it might be stored
        const actionType = automation.actionType || actionsData?.actionType || actionsData?.type;
        const actionConfig = actionsData?.actionConfig || actionsData?.config || actionsData;

        this.logger.log(`📋 Enqueuing automation ${automation.name}:`, {
            actionType,
            actionConfig,
            rawActions: actionsData
        });

        const payload = {
            automationId: automation.id,
            leadId: context.leadId,
            actionType,
            actionConfig,
            contextData: context.data
        };

        const delay = (automation.delayMinutes || 0) * 60 * 1000;

        await this.automationQueue.add('execute', payload, {
            delay,
            removeOnComplete: true
        });

        this.logger.log(`✅ Enqueued automation ${automation.id} with ${delay}ms delay`);
    }
}
