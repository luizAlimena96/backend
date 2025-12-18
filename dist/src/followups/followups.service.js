"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowupsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const whatsapp_integration_service_1 = require("../integrations/whatsapp/whatsapp-integration.service");
const openai_service_1 = require("../ai/services/openai.service");
let FollowupsService = class FollowupsService {
    prisma;
    whatsappService;
    openaiService;
    constructor(prisma, whatsappService, openaiService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
        this.openaiService = openaiService;
    }
    async findAll(agentId) {
        const followups = await this.prisma.followup.findMany({
            where: { agentId },
            orderBy: { createdAt: "desc" },
        });
        return followups.map(followup => ({
            ...followup,
            messageTemplate: followup.message,
            delayMinutes: Math.round(followup.delayHours * 60),
        }));
    }
    async findOne(id) {
        const followup = await this.prisma.followup.findUnique({
            where: { id },
            include: { logs: true },
        });
        if (!followup)
            return null;
        const mapped = {
            ...followup,
            messageTemplate: followup.message,
            delayMinutes: Math.round(followup.delayHours * 60),
        };
        return mapped;
    }
    async create(data) {
        console.log('[Followups] Create data received:', JSON.stringify(data, null, 2));
        const agent = await this.prisma.agent.findUnique({
            where: { id: data.agentId },
            select: { organizationId: true },
        });
        if (!agent) {
            throw new Error('Agent not found');
        }
        const followupData = {
            name: data.name,
            message: data.messageTemplate || data.message || '',
            condition: 'ALWAYS',
            delayHours: data.delayMinutes ? data.delayMinutes / 60 : 0,
            isActive: data.isActive ?? true,
            agentId: data.agentId,
            organizationId: agent.organizationId,
            crmStageId: data.crmStageId || null,
            aiDecisionEnabled: data.aiDecisionEnabled ?? false,
            aiDecisionPrompt: data.aiDecisionPrompt || null,
            audioVoiceId: data.audioVoiceId || null,
            mediaType: data.mediaType || 'text',
            mediaUrl: data.mediaUrl || null,
            respectBusinessHours: data.businessHoursEnabled ?? false,
            specificHour: data.specificHour || null,
            specificMinute: data.specificMinute || null,
            specificTimeEnabled: data.specificTimeEnabled ?? false,
            delayMinutes: data.delayMinutes || 0,
        };
        console.log('[Followups] Creating with data:', JSON.stringify(followupData, null, 2));
        const created = await this.prisma.followup.create({ data: followupData });
        return {
            ...created,
            messageTemplate: created.message,
            delayMinutes: Math.round(created.delayHours * 60),
        };
    }
    async update(id, data) {
        console.log('[Followups] Update data received:', JSON.stringify(data, null, 2));
        const updateData = {};
        if (data.name !== undefined)
            updateData.name = data.name;
        if (data.messageTemplate !== undefined || data.message !== undefined) {
            updateData.message = data.messageTemplate || data.message || '';
        }
        if (data.delayMinutes !== undefined) {
            updateData.delayHours = data.delayMinutes / 60;
            updateData.delayMinutes = data.delayMinutes;
        }
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        if (data.crmStageId !== undefined)
            updateData.crmStageId = data.crmStageId;
        if (data.aiDecisionEnabled !== undefined)
            updateData.aiDecisionEnabled = data.aiDecisionEnabled;
        if (data.aiDecisionPrompt !== undefined)
            updateData.aiDecisionPrompt = data.aiDecisionPrompt;
        if (data.audioVoiceId !== undefined)
            updateData.audioVoiceId = data.audioVoiceId;
        if (data.mediaType !== undefined)
            updateData.mediaType = data.mediaType;
        if (data.mediaUrl !== undefined)
            updateData.mediaUrl = data.mediaUrl;
        if (data.businessHoursEnabled !== undefined)
            updateData.respectBusinessHours = data.businessHoursEnabled;
        if (data.specificHour !== undefined)
            updateData.specificHour = data.specificHour;
        if (data.specificMinute !== undefined)
            updateData.specificMinute = data.specificMinute;
        if (data.specificTimeEnabled !== undefined)
            updateData.specificTimeEnabled = data.specificTimeEnabled;
        console.log('[Followups] Updating with data:', JSON.stringify(updateData, null, 2));
        const updated = await this.prisma.followup.update({ where: { id }, data: updateData });
        return {
            ...updated,
            messageTemplate: updated.message,
            delayMinutes: Math.round(updated.delayHours * 60),
        };
    }
    async delete(id) {
        await this.prisma.followup.delete({ where: { id } });
        return { success: true };
    }
    async checkAgentFollowUps(forceIgnoreDelay = false) {
        console.log('[Followups Service] Checking for pending follow-ups...', { forceIgnoreDelay });
        try {
            const activeFollowups = await this.prisma.followup.findMany({
                where: {
                    isActive: true,
                },
                include: {
                    agent: {
                        include: {
                            organization: {
                                select: {
                                    workingHours: true,
                                    evolutionInstanceName: true,
                                },
                            },
                        },
                    },
                },
            });
            console.log(`[Followups Service] Found ${activeFollowups.length} active followup rules`);
            let processedCount = 0;
            for (const followup of activeFollowups) {
                try {
                    console.log(`[Followups Service] Processing followup: ${followup.name} (ID: ${followup.id})`);
                    console.log(`[Followups Service] - CRM Stage: ${followup.crmStageId || 'ANY'}`);
                    console.log(`[Followups Service] - Delay: ${followup.delayHours} hours (${Math.round(followup.delayHours * 60)} minutes)`);
                    const eligibleConversations = await this.getFollowupEligibleConversations(followup);
                    console.log(`[Followups Service] Found ${eligibleConversations.length} eligible conversations for followup ${followup.id}`);
                    for (const conversation of eligibleConversations) {
                        try {
                            const shouldSend = forceIgnoreDelay || await this.checkFollowupConditions(conversation, followup);
                            if (forceIgnoreDelay) {
                                console.log(`[Followups] 🚀 FORCE MODE: Ignoring delay check for conversation ${conversation.id}`);
                            }
                            if (shouldSend) {
                                await this.sendFollowup(conversation, followup);
                                processedCount++;
                            }
                        }
                        catch (error) {
                            console.error(`[Followups Service] Error processing conversation ${conversation.id}:`, error);
                        }
                    }
                }
                catch (error) {
                    console.error(`[Followups Service] Error processing followup ${followup.id}:`, error);
                }
            }
            console.log(`[Followups Service] Processed ${processedCount} follow-ups`);
            return {
                processed: processedCount,
                rulesChecked: activeFollowups.length,
            };
        }
        catch (error) {
            console.error('[Followups Service] Error in checkAgentFollowUps:', error);
            throw error;
        }
    }
    async getFollowupEligibleConversations(followup) {
        let eligibleStates = null;
        if (followup.crmStageId) {
            const crmStage = await this.prisma.cRMStage.findUnique({
                where: { id: followup.crmStageId },
                include: {
                    states: {
                        select: { name: true },
                    },
                },
            });
            if (crmStage && crmStage.states.length > 0) {
                eligibleStates = crmStage.states.map(s => s.name);
                console.log(`[Followups] CRM Stage "${crmStage.name}" has states:`, eligibleStates);
            }
        }
        const conversations = await this.prisma.conversation.findMany({
            where: {
                agentId: followup.agentId,
                aiEnabled: true,
                lead: {
                    ...(eligibleStates && eligibleStates.length > 0 && {
                        currentState: {
                            in: eligibleStates,
                        },
                    }),
                },
            },
            include: {
                messages: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
                lead: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        currentState: true,
                        crmStageId: true,
                        conversationSummary: true,
                        extractedData: true,
                    },
                },
            },
        });
        const filtered = conversations.filter((conv) => conv.messages && conv.messages.length > 0);
        console.log(`[Followups] Filtered ${filtered.length} conversations with messages`);
        return filtered;
    }
    async checkFollowupConditions(conversation, followup) {
        const lastMessage = conversation.messages[0];
        if (!lastMessage) {
            console.log(`[Followups] No messages in conversation ${conversation.id}`);
            return false;
        }
        const hoursSinceLastMessage = (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);
        const minutesSinceLastMessage = Math.round(hoursSinceLastMessage * 60);
        console.log(`[Followups] Conversation ${conversation.id}:`);
        console.log(`  - Lead: ${conversation.lead?.name} (${conversation.leadId})`);
        console.log(`  - Last message: ${minutesSinceLastMessage} minutes ago`);
        console.log(`  - Required delay: ${Math.round(followup.delayHours * 60)} minutes`);
        console.log(`  - Time check: ${hoursSinceLastMessage >= followup.delayHours ? '✅ PASS' : '❌ FAIL'}`);
        if (hoursSinceLastMessage < followup.delayHours) {
            console.log(`  ⏱️ Skipping: Not enough time passed`);
            return false;
        }
        if (conversation.lead?.status === 'inactive' || conversation.lead?.status === 'converted') {
            console.log(`  ❌ Skipping: Lead is ${conversation.lead.status}`);
            return false;
        }
        if (conversation.leadId) {
            const alreadySent = await this.prisma.followupLog.findFirst({
                where: {
                    leadId: conversation.leadId,
                    followupId: followup.id,
                },
            });
            if (alreadySent) {
                console.log(`  🔒 Skipping: Follow-up already sent to this lead on ${alreadySent.sentAt.toLocaleString()}`);
                return false;
            }
        }
        if (followup.agent?.organization?.workingHours) {
            const isWithinWorkingHours = this.checkWorkingHours(followup.agent.organization.workingHours);
            if (!isWithinWorkingHours) {
                console.log(`[Followups Service] Outside working hours, skipping`);
                return false;
            }
        }
        return true;
    }
    async sendFollowup(conversation, followup) {
        const instanceName = followup.agent?.organization?.evolutionInstanceName;
        const recipient = conversation.whatsapp;
        if (!instanceName) {
            console.error(`[Followups Service] ❌ No instance configured for agent ${followup.agentId}`);
            if (conversation.leadId) {
                await this.prisma.followupLog.create({
                    data: {
                        leadId: conversation.leadId,
                        followupId: followup.id,
                        message: `[ERRO] Instância não configurada para o agente`,
                    },
                });
            }
            return;
        }
        console.log(`[Followups] 📤 Preparing to send follow-up:`);
        console.log(`  - Instance: ${instanceName}`);
        console.log(`  - Recipient: ${recipient}`);
        console.log(`  - Agent ID: ${followup.agentId}`);
        console.log(`  - Follow-up ID: ${followup.id}`);
        let messageToSend = followup.message;
        try {
            if (followup.aiDecisionEnabled && followup.aiDecisionPrompt) {
                console.log(`[Followups] 🤖 AI mode enabled - generating personalized message`);
                try {
                    const messages = await this.prisma.message.findMany({
                        where: { conversationId: conversation.id },
                        orderBy: { timestamp: 'asc' },
                        take: 20,
                    });
                    const conversationContext = messages
                        .map(m => `${m.fromMe ? 'Assistente' : 'Lead'}: ${m.content}`)
                        .join('\n');
                    const aiPrompt = `${followup.aiDecisionPrompt}

Contexto do Lead:
- Nome: ${conversation.lead?.name || 'Não informado'}
- Telefone: ${conversation.whatsapp}

Histórico da Conversa (últimas mensagens):
${conversationContext}

Gere uma mensagem de follow-up personalizada baseada neste contexto.`;
                    const organization = await this.prisma.organization.findUnique({
                        where: { id: followup.organizationId },
                        select: { openaiApiKey: true },
                    });
                    if (!organization?.openaiApiKey) {
                        throw new Error('OpenAI API key not configured for organization');
                    }
                    messageToSend = await this.openaiService.createChatCompletion(organization.openaiApiKey, 'gpt-4o-mini', [
                        {
                            role: 'system',
                            content: 'Você é um assistente que cria mensagens de follow-up personalizadas para leads. Seja natural, empático e direto.',
                        },
                        {
                            role: 'user',
                            content: aiPrompt,
                        },
                    ], {
                        temperature: 0.7,
                        maxTokens: 500,
                    });
                    console.log(`[Followups] ✅ AI generated message: ${messageToSend.substring(0, 100)}...`);
                }
                catch (error) {
                    console.error(`[Followups] ❌ Error generating AI message:`, error.message);
                    console.log(`[Followups] ⚠️ Falling back to template message`);
                }
            }
            if (!followup.aiDecisionEnabled && conversation.lead) {
                const leadName = conversation.lead.name || 'você';
                messageToSend = messageToSend.replace(/\{\{nome\}\}/g, leadName);
            }
            console.log(`  - Message: ${messageToSend.substring(0, 100)}...`);
            const isTestAI = recipient.startsWith('test_') || conversation.lead?.name?.includes('Test User');
            if (conversation.leadId) {
                await this.prisma.followupLog.create({
                    data: {
                        leadId: conversation.leadId,
                        followupId: followup.id,
                        message: messageToSend,
                    },
                });
                console.log(`[Followups] ✅ Created followup log (prevents retry)`);
            }
            await this.prisma.message.create({
                data: {
                    messageId: `followup_${followup.id}_${Date.now()}`,
                    conversationId: conversation.id,
                    content: messageToSend,
                    fromMe: true,
                    type: 'TEXT',
                    timestamp: new Date(),
                },
            });
            console.log(`[Followups] ✅ Saved follow-up message to conversation`);
            if (!isTestAI) {
                try {
                    if (followup.mediaType === 'text' || !followup.mediaType) {
                        console.log(`[Followups] 📨 Sending text message via Evolution API...`);
                        await this.whatsappService.sendMessage(instanceName, recipient, messageToSend);
                    }
                    else if (followup.mediaType === 'media' && followup.mediaUrl) {
                        console.log(`[Followups] 📷 Sending media message via Evolution API...`);
                        await this.whatsappService.sendMedia(instanceName, recipient, followup.mediaUrl, messageToSend);
                    }
                    console.log(`[Followups Service] ✅ Sent follow-up to ${recipient} via Evolution API`);
                }
                catch (sendError) {
                    const statusCode = sendError?.response?.status || sendError?.status;
                    if (statusCode >= 400 && statusCode < 500) {
                        console.error(`[Followups Service] ❌ Permanent failure (${statusCode}): ${sendError.message}`);
                        console.error(`[Followups Service] ⚠️ Instance "${instanceName}" may not exist or is offline`);
                    }
                    else {
                        console.error(`[Followups Service] ⚠️ Temporary failure (${statusCode}): ${sendError.message}`);
                    }
                }
            }
            else {
                console.log(`[Followups] 🧪 Test AI detected - skipping Evolution API send`);
            }
        }
        catch (error) {
            console.error(`[Followups Service] ❌ Error in follow-up preparation:`, error.message);
        }
    }
    checkWorkingHours(workingHours) {
        if (!workingHours)
            return true;
        const now = new Date();
        const currentDay = now.getDay();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[currentDay];
        if (!workingHours[dayName]?.enabled) {
            return false;
        }
        const startTime = this.parseTime(workingHours[dayName].start);
        const endTime = this.parseTime(workingHours[dayName].end);
        return currentTime >= startTime && currentTime <= endTime;
    }
    parseTime(timeStr) {
        if (!timeStr)
            return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }
};
exports.FollowupsService = FollowupsService;
exports.FollowupsService = FollowupsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_integration_service_1.WhatsAppIntegrationService,
        openai_service_1.OpenAIService])
], FollowupsService);
//# sourceMappingURL=followups.service.js.map