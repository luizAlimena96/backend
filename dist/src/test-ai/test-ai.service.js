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
exports.TestAIService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const fsm_engine_service_1 = require("../ai/fsm-engine/fsm-engine.service");
const openai_service_1 = require("../ai/services/openai.service");
const elevenlabs_service_1 = require("../integrations/elevenlabs/elevenlabs.service");
const agent_followup_service_1 = require("../common/services/agent-followup.service");
let TestAIService = class TestAIService {
    prisma;
    fsmEngine;
    openaiService;
    elevenLabsService;
    agentFollowup;
    constructor(prisma, fsmEngine, openaiService, elevenLabsService, agentFollowup) {
        this.prisma = prisma;
        this.fsmEngine = fsmEngine;
        this.openaiService = openaiService;
        this.elevenLabsService = elevenLabsService;
        this.agentFollowup = agentFollowup;
    }
    async processMessage(data, userId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }
        const { message, organizationId, agentId, conversationHistory, file } = data;
        if ((!message && !file) || !organizationId || !agentId) {
            throw new common_1.ForbiddenException('Message (or File), organizationId, and agentId are required');
        }
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
        }
        const agent = await this.prisma.agent.findUnique({
            where: { id: agentId },
            include: {
                states: {
                    orderBy: { order: 'asc' },
                },
                knowledge: true,
            },
        });
        if (!agent) {
            throw new common_1.NotFoundException('Agent not found');
        }
        const testPhone = `test_${organizationId}`;
        let lead = await this.prisma.lead.findFirst({
            where: {
                phone: testPhone,
                organizationId,
            },
        });
        if (!lead) {
            lead = await this.prisma.lead.create({
                data: {
                    phone: testPhone,
                    name: 'Test User (SUPER_ADMIN)',
                    status: 'NEW',
                    currentState: agent.states?.[0]?.name || 'INICIO',
                    agentId: agent.id,
                    organizationId,
                    extractedData: {},
                },
            });
        }
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                whatsapp: testPhone,
                organizationId,
            },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    whatsapp: testPhone,
                    leadId: lead.id,
                    agentId: agent.id,
                    organizationId,
                },
            });
        }
        let processedMessage = message || '';
        if (file) {
            const apiKey = organization.openaiApiKey || process.env.OPENAI_API_KEY;
            if (file.type.startsWith('audio/') && apiKey) {
                try {
                    const transcription = await this.openaiService.transcribeAudio(apiKey, file.base64);
                    processedMessage = `[ÁUDIO TRANSCRITO]: ${transcription}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                }
                catch (error) {
                    console.error('[Test AI] Error transcribing audio:', error);
                    processedMessage = `[Arquivo de áudio enviado]${message ? `\n${message}` : ''}`;
                }
            }
            else {
                processedMessage = `[Arquivo]: ${file.name}${message ? `\n${message}` : ''}`;
            }
        }
        await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: processedMessage,
                fromMe: false,
                type: file ? (file.type.startsWith('audio') ? 'AUDIO' : 'DOCUMENT') : 'TEXT',
                messageId: crypto.randomUUID(),
            },
        });
        const currentState = agent.states?.find(s => s.name === lead.currentState) || agent.states?.[0];
        if (!currentState) {
            throw new common_1.NotFoundException('No states configured for this agent');
        }
        const history = conversationHistory?.map((msg) => ({
            role: msg.fromMe ? 'assistant' : 'user',
            content: msg.content,
        })) || [];
        history.push({
            role: 'user',
            content: processedMessage,
        });
        const fsmDecision = await this.fsmEngine.decideNextState({
            agentId: agent.id,
            currentState: lead.currentState || 'INICIO',
            lastMessage: processedMessage,
            extractedData: lead.extractedData || {},
            conversationHistory: history,
            leadId: lead.id,
            organizationId,
        });
        await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                currentState: fsmDecision.nextState,
                extractedData: fsmDecision.extractedData,
            },
        });
        const nextStateInfo = agent.states?.find(s => s.name === fsmDecision.nextState) || agent.states?.[0];
        const knowledgeContext = agent.knowledge.map(k => `${k.title}: ${k.content}`).join('\n');
        const dataRequirement = fsmDecision.dataToExtract
            ? `\n\n[DADO OBRIGATÓRIO PARA COLETAR]: ${fsmDecision.dataToExtract}`
            : '';
        const fsmDirectives = fsmDecision.reasoning.join('\n');
        const systemPrompt = `${agent.systemPrompt || 'Você é um assistente virtual inteligente.'}

ESTADO ATUAL: ${nextStateInfo?.name}
MISSÃO NESTE ESTADO: ${nextStateInfo?.missionPrompt}${dataRequirement}

DIRETRIZES DO MOTOR DE DECISÃO:
${fsmDirectives}

BASE DE CONHECIMENTO:
${knowledgeContext}

DADOS EXTRAÍDOS DO LEAD:
${JSON.stringify(fsmDecision.extractedData || {}, null, 2)}

Responda de forma natural e ajude o usuário conforme a missão do estado atual.`;
        const apiKey = organization.openaiApiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API Key not configured');
        }
        const aiResponse = await this.openaiService.createChatCompletion(apiKey, organization.openaiModel || 'gpt-4o-mini', [
            { role: 'system', content: systemPrompt },
            ...history,
        ], { maxTokens: 500 });
        const aiMessage = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: aiResponse,
                fromMe: true,
                type: 'TEXT',
                messageId: crypto.randomUUID(),
                thought: fsmDecision.reasoning.join('\n'),
            },
        });
        const debugLog = await this.prisma.debugLog.create({
            data: {
                phone: testPhone,
                conversationId: conversation.id,
                clientMessage: processedMessage,
                aiResponse: aiResponse,
                currentState: fsmDecision.nextState,
                aiThinking: fsmDecision.reasoning.join('\n'),
                organizationId,
                agentId: agent.id,
                leadId: lead.id,
            },
        });
        let audioBase64 = null;
        if (agent.audioResponseEnabled && organization.elevenLabsApiKey) {
            try {
                const audioBuffer = await this.elevenLabsService.textToSpeech(aiResponse, organization.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM', organization.elevenLabsApiKey);
                audioBase64 = audioBuffer.toString('base64');
            }
            catch (error) {
                console.error('[Test AI] Error generating audio:', error);
            }
        }
        return {
            response: aiResponse,
            audioBase64,
            thinking: fsmDecision.reasoning.join('\n'),
            state: fsmDecision.nextState,
            extractedData: fsmDecision.extractedData,
            newDebugLog: {
                id: debugLog.id,
                clientMessage: processedMessage,
                aiResponse: aiResponse,
                currentState: fsmDecision.nextState,
                aiThinking: fsmDecision.reasoning.join('\n'),
                createdAt: debugLog.createdAt.toISOString(),
                extractedData: fsmDecision.extractedData,
            },
            sentMessages: [{
                    id: aiMessage.id,
                    content: aiResponse,
                    timestamp: aiMessage.timestamp,
                    thought: fsmDecision.reasoning.join('\n'),
                    type: 'TEXT',
                }],
        };
    }
    async getHistory(organizationId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }
        const testPhone = `test_${organizationId}`;
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                whatsapp: testPhone,
                organizationId,
            },
            include: {
                messages: {
                    orderBy: { timestamp: 'asc' },
                },
            },
        });
        if (!conversation) {
            return { messages: [], debugLogs: [], extractedData: null };
        }
        const lead = conversation.leadId
            ? await this.prisma.lead.findUnique({
                where: { id: conversation.leadId },
            })
            : null;
        const debugLogs = await this.prisma.debugLog.findMany({
            where: {
                conversationId: conversation.id,
            },
            orderBy: { createdAt: 'desc' },
        });
        const messagesWithThoughts = conversation.messages.map((msg) => ({
            id: msg.id,
            content: msg.content,
            fromMe: msg.fromMe,
            timestamp: msg.timestamp,
            thinking: msg.thought,
            state: msg.fromMe ? lead?.currentState : undefined,
            type: msg.type,
        }));
        return {
            messages: messagesWithThoughts,
            debugLogs,
            extractedData: lead?.extractedData,
        };
    }
    async resetConversation(organizationId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }
        const testPhone = `test_${organizationId}`;
        const conversation = await this.prisma.conversation.findFirst({
            where: {
                whatsapp: testPhone,
                organizationId,
            },
        });
        if (conversation) {
            await this.prisma.conversation.delete({
                where: { id: conversation.id },
            });
            await this.prisma.debugLog.deleteMany({
                where: { conversationId: conversation.id },
            });
        }
        const lead = await this.prisma.lead.findFirst({
            where: {
                phone: testPhone,
                organizationId,
            },
        });
        if (lead) {
            await this.prisma.lead.delete({
                where: { id: lead.id },
            });
        }
        return { success: true };
    }
    async triggerFollowup(organizationId, agentId, userRole) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }
        try {
            const testConversation = await this.prisma.conversation.findFirst({
                where: {
                    agentId,
                    whatsapp: { contains: 'test-ai' },
                },
                include: {
                    lead: true,
                },
            });
            if (!testConversation || !testConversation.leadId) {
                return {
                    success: false,
                    message: 'Nenhuma conversa de teste encontrada. Envie uma mensagem primeiro.',
                };
            }
            await this.agentFollowup.checkAndCreateFollowups(testConversation.leadId);
            const stats = await this.agentFollowup.getFollowupStats(testConversation.leadId);
            return {
                success: true,
                message: `Follow-up verificado! Total enviados: ${stats.totalSent}`,
                stats,
            };
        }
        catch (error) {
            console.error('[Test AI] Error triggering followup:', error);
            return {
                success: false,
                message: 'Erro ao verificar follow-ups: ' + error.message,
            };
        }
    }
};
exports.TestAIService = TestAIService;
exports.TestAIService = TestAIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        fsm_engine_service_1.FSMEngineService,
        openai_service_1.OpenAIService,
        elevenlabs_service_1.ElevenLabsService,
        agent_followup_service_1.AgentFollowupService])
], TestAIService);
//# sourceMappingURL=test-ai.service.js.map