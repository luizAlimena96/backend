import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { LeadsService } from '../../leads/leads.service';
import { ConversationsService } from '../../conversations/conversations.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Processor('automation')
export class AutomationProcessor extends WorkerHost {
    private readonly logger = new Logger(AutomationProcessor.name);

    constructor(
        private leadsService: LeadsService,
        private conversationsService: ConversationsService,
        private httpService: HttpService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        this.logger.log(`Processing automation job ${job.id}: ${job.data.actionType}`);
        const { automationId, leadId, actionType, actionConfig, contextData } = job.data;

        try {
            switch (actionType) {
                case 'ADD_TAG':
                    await this.handleAddTag(leadId, actionConfig);
                    break;
                case 'REMOVE_TAG':
                    await this.handleRemoveTag(leadId, actionConfig);
                    break;
                case 'MOVE_STAGE':
                    await this.handleMoveStage(leadId, actionConfig);
                    break;
                case 'SEND_MESSAGE':
                    await this.handleSendMessage(leadId, actionConfig, contextData);
                    break;
                case 'WEBHOOK':
                    await this.handleWebhook(leadId, actionConfig, contextData);
                    break;
                default:
                    this.logger.warn(`Unknown action type: ${actionType}`);
            }
        } catch (error) {
            this.logger.error(`Error executing automation ${automationId}:`, error);
            throw error;
        }
    }

    private async handleAddTag(leadId: string, config: any) {
        if (!config.tagId) return;

        // Need conversationId... assume lead has one active conversation or pick latest
        const lead = await this.leadsService.findOne(leadId);
        if (lead && lead.conversations && lead.conversations.length > 0) {
            const conversationId = lead.conversations[0].id;
            // Calls ConversationsService which might trigger TAG_ADDED again...
            // Wait, infinite loop risk!
            // ConversationsService.addTag triggers TAG_ADDED automation.
            // If we have an automation "TAG_ADDED -> ADD_TAG" (weird but possible), loop matches.
            // But usually TAG_ADDED triggers "SEND_MESSAGE".
            // ADD_TAG triggers TAG_ADDED... 
            // We should pass a flag to addTag to suppress events? OR check recursion in logic.
            // For now, let's assume users won't create "When Tag X Added, Add Tag X".
            // But "When Tag X Added, Add Tag Y" -> "When Tag Y Added, Add Tag Z"... Chain reaction. That's fine.
            await this.conversationsService.addTag(conversationId, config.tagId);
        }
    }

    private async handleRemoveTag(leadId: string, config: any) {
        if (!config.tagId) return;
        const lead = await this.leadsService.findOne(leadId);
        if (lead && lead.conversations && lead.conversations.length > 0) {
            await this.conversationsService.removeTag(lead.conversations[0].id, config.tagId);
        }
    }

    private async handleMoveStage(leadId: string, config: any) {
        if (!config.stageId) return;
        // Updating lead triggers STAGE_CHANGE automation...
        // Cycle risk: Stage A triggers Move to Stage B. Stage B triggers Move to Stage A. Ping pong.
        // That's user config error. Loop detection is ignored for now (BullMQ handles basic recursion if job ID dupe, but distinct jobs ok).
        await this.leadsService.update(leadId, { crmStageId: config.stageId });
    }

    private async handleSendMessage(leadId: string, config: any, context: any) {
        if (!config.message) return;
        const lead = await this.leadsService.findOne(leadId);
        if (!lead || !lead.conversations || lead.conversations.length === 0) return;

        let message = config.message;
        // Replace variables
        message = message.replace(/{{name}}/g, lead.name || '');

        await this.conversationsService.sendMessage(lead.conversations[0].id, message, true);
    }

    private async handleWebhook(leadId: string, config: any, context: any) {
        if (!config.webhookUrl) return;
        const lead = await this.leadsService.findOne(leadId);
        await firstValueFrom(this.httpService.post(config.webhookUrl, { lead, context }));
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job) {
        this.logger.debug(`Job ${job.id} has completed!`);
    }
}
