import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ZapSignService } from '../../integrations/zapsign/zapsign.service';
import { SchedulingToolsService } from '../../ai/tools/scheduling-tools.service';
import { WhatsAppIntegrationService } from '../../integrations/whatsapp/whatsapp-integration.service';
import { OpenAIService } from '../../ai/services/openai.service';
import * as crypto from 'crypto';

@Injectable()
export class CRMAutomationService {
    constructor(
        private prisma: PrismaService,
        private zapSignService: ZapSignService,
        private schedulingToolsService: SchedulingToolsService,
        private whatsappService: WhatsAppIntegrationService,
        private openaiService: OpenAIService
    ) { }

    async executeAutomationsForState(leadId: string, stageId: string): Promise<void> {
        console.log(`[CRM Automation] Checking automations for lead ${leadId} in stage ${stageId}`);

        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    agent: {
                        include: {
                            organization: true
                        }
                    }
                }
            });

            if (!lead || !lead.agent) {
                console.log('[CRM Automation] Lead or Agent not found');
                return;
            }

            // 1. Check ZapSign Trigger
            if (lead.agent.zapSignTriggerCrmStageId === stageId) {
                await this.handleZapSignTrigger(lead, stageId);
            }

            // 2. Check Auto Scheduling Trigger
            await this.handleAutoScheduling(lead, stageId);

        } catch (error) {
            console.error('[CRM Automation] Error executing automations:', error);
        }
    }

    private async handleAutoScheduling(lead: any, stageId: string) {
        try {
            const config = await this.prisma.autoSchedulingConfig.findFirst({
                where: {
                    agentId: lead.agentId,
                    crmStageId: stageId,
                    isActive: true
                }
            });

            if (!config) return;

            console.log(`[CRM Automation] Auto Scheduling triggered for lead ${lead.id}`);

            const extractedData = lead.extractedData as any || {};
            const periodoDia = extractedData.periodo_dia || undefined;

            // 1. Fetch available slots
            const slotsResult = await this.schedulingToolsService.gerenciarAgenda('sugerir_iniciais', {
                organizationId: lead.organizationId,
                leadId: lead.id,
                periodo_dia: periodoDia
            });

            if (!slotsResult.success || !slotsResult.horarios) {
                console.log('[CRM Automation] No slots available to offer.');
                return;
            }

            // 2. Prepare context for AI
            const slotsText = slotsResult.horarios.map(h => `- ${h.dia} às ${h.horario}`).join('\n');
            const systemPrompt = `Você é ${lead.agent.name}.
O lead ${lead.name} acabou de entrar na etapa de Agendamento.
Sua tarefa é convidar o lead para uma reunião, oferecendo os seguintes horários disponíveis:

${slotsText}

Use este modelo de mensagem configurado pelo usuário como BASE (adapte para soar natural):
"${config.messageTemplate || ''}"

Responda diretamente ao lead. Seja cordial e breve.`;

            // 3. Generate AI Message
            if (!lead.agent.organization.openaiApiKey) {
                console.error('[CRM Automation] No OpenAI API Key found');
                return;
            }

            const aiResponse = await this.openaiService.createChatCompletion(
                lead.agent.organization.openaiApiKey,
                lead.agent.organization.openaiModel || 'gpt-4o-mini',
                [{ role: 'system', content: systemPrompt }],
                { maxTokens: 300 }
            );

            // 4. Send Message via WhatsApp
            const conversation = await this.prisma.conversation.findFirst({
                where: { leadId: lead.id, organizationId: lead.organizationId }
            });

            if (conversation) {
                // Save to DB
                await this.prisma.message.create({
                    data: {
                        conversationId: conversation.id,
                        content: aiResponse,
                        fromMe: true,
                        type: 'TEXT',
                        messageId: crypto.randomUUID(),
                        thought: 'Disparo Automático de Agendamento (Stage Trigger)'
                    }
                });

                // Send to WhatsApp
                await this.whatsappService.sendMessage(
                    lead.agent.organization.evolutionInstanceName,
                    lead.phone,
                    aiResponse
                );
                console.log('[CRM Automation] Auto scheduling message sent.');
            }

        } catch (error) {
            console.error('[CRM Automation] Error in auto scheduling:', error);
        }
    }

    private async handleZapSignTrigger(lead: any, stageId: string) {
        console.log('[CRM Automation] Triggering ZapSign flow for lead:', lead.id);

        const agent = lead.agent;
        const org = agent.organization;

        if (!org.zapSignApiToken || !org.zapSignTemplateId) {
            console.error('[CRM Automation] ZapSign not configured for organization');
            return;
        }

        const mapping = agent.zapSignFieldMapping as any[];
        if (!mapping || mapping.length === 0) {
            console.error('[CRM Automation] No ZapSign field mapping for agent');
            return;
        }

        // Map fields
        const customData = mapping.map(m => {
            const value = this.resolveValue(m.leadField, lead);
            return {
                variable: m.templateField.replace('{{ $json.', '').replace(' }}', '').trim(),
                value: value
            };
        });

        // Construct payload
        const payload = {
            signers: [{
                name: lead.name,
                email: lead.email,
                send_automatic_email: false,
                send_automatic_whatsapp: false
            }],
            data: customData.map(d => ({
                de: d.variable,
                para: d.value
            }))
        };

        try {
            const doc = await this.zapSignService.createDocument(org.zapSignApiToken, org.zapSignTemplateId, payload);
            console.log('[CRM Automation] ZapSign document created:', doc.uuid);

            // 1. Update Lead with Document ID
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: {
                    zapSignDocumentId: doc.uuid,
                    zapSignStatus: 'CREATED'
                }
            });

            // 2. Find signer link for this lead
            // ZapSign returns 'signers' array. We match by email/phone or just take the first one if logic implies 1-1
            const signer = doc.signers.find((s: any) => s.email === lead.email || s.phone_number === lead.phone);
            const signUrl = signer ? signer.sign_url : doc.signers[0]?.sign_url;

            if (signUrl) {
                const message = `Olá ${lead.name}, aqui está o seu contrato para assinatura: ${signUrl}`;

                // Get conversation
                const conversation = await this.prisma.conversation.findFirst({
                    where: { leadId: lead.id, organizationId: lead.organizationId }
                });

                if (conversation) {
                    await this.prisma.message.create({
                        data: {
                            conversationId: conversation.id,
                            content: message,
                            fromMe: true,
                            type: 'TEXT',
                            messageId: crypto.randomUUID(),
                            thought: 'Envio Automático de Contrato (ZapSign)'
                        }
                    });

                    await this.whatsappService.sendMessage(
                        lead.agent.organization.evolutionInstanceName,
                        lead.phone,
                        message
                    );
                    console.log('[CRM Automation] ZapSign link sent to WhatsApp');
                }
            }

        } catch (err) {
            console.error('[CRM Automation] Failed to create ZapSign doc:', err);
        }
    }

    private resolveValue(path: string, context: any): string {
        try {
            // Remove {{ }}
            const cleanPath = path.replace(/{{|}}/g, '').trim();

            // Handle specific cases
            if (cleanPath === 'currentDate') return new Date().toLocaleDateString('pt-BR');
            if (cleanPath === 'lead.name') return context.name || '';
            if (cleanPath === 'lead.email') return context.email || '';
            if (cleanPath === 'lead.phone') return context.phone || '';
            if (cleanPath === 'lead.cpf') return context.cpf || '';
            if (cleanPath === 'lead.rg') return context.rg || '';

            // Handle lead.extractedData.field (supports nested objects!)
            // Examples: lead.extractedData.cpf, lead.extractedData.dados_cliente.nome
            if (cleanPath.startsWith('lead.extractedData.')) {
                const fieldPath = cleanPath.split('lead.extractedData.')[1];
                // Navigate nested objects using dot notation
                const parts = fieldPath.split('.');
                let value: any = context.extractedData;

                for (const part of parts) {
                    if (value === undefined || value === null) return '';
                    value = value[part];
                }

                // If value is an object, stringify it
                if (typeof value === 'object') {
                    return JSON.stringify(value);
                }

                return value?.toString() || '';
            }

            return '';
        } catch (e) {
            console.error('[CRM Automation] Error resolving value:', e);
            return '';
        }
    }

    async createAutomation(data: any): Promise<any> {
        console.log('[CRM Automation] Would create automation:', data.name);
        return { id: 'placeholder', ...data };
    }
}
