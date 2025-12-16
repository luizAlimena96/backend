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
const openai_service_1 = require("../ai/services/openai.service");
const elevenlabs_service_1 = require("../integrations/elevenlabs/elevenlabs.service");
const fsm_engine_service_1 = require("../ai/fsm-engine/fsm-engine.service");
const leads_service_1 = require("../leads/leads.service");
const media_analysis_service_1 = require("../ai/services/media-analysis.service");
const pdf_service_1 = require("../common/services/pdf.service");
const followups_service_1 = require("../followups/followups.service");
let TestAIService = class TestAIService {
    prisma;
    openaiService;
    elevenLabsService;
    fsmEngineService;
    leadsService;
    mediaAnalysisService;
    pdfService;
    followupsService;
    constructor(prisma, openaiService, elevenLabsService, fsmEngineService, leadsService, mediaAnalysisService, pdfService, followupsService) {
        this.prisma = prisma;
        this.openaiService = openaiService;
        this.elevenLabsService = elevenLabsService;
        this.fsmEngineService = fsmEngineService;
        this.leadsService = leadsService;
        this.mediaAnalysisService = mediaAnalysisService;
        this.pdfService = pdfService;
        this.followupsService = followupsService;
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
        let userSentAudio = false;
        if (file) {
            const apiKey = organization.openaiApiKey || process.env.OPENAI_API_KEY;
            if (file.type.startsWith('audio/') && apiKey) {
                userSentAudio = true;
                try {
                    const transcription = await this.openaiService.transcribeAudio(apiKey, file.base64);
                    processedMessage = `[ÁUDIO TRANSCRITO]: ${transcription}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                }
                catch (error) {
                    console.error('[Test AI] Error transcribing audio:', error);
                    processedMessage = `[Arquivo de áudio enviado]${message ? `\n${message}` : ''}`;
                }
            }
            else if (file.type.startsWith('image/') && apiKey) {
                try {
                    console.log('[Test AI] Analyzing image...');
                    const imageAnalysis = await this.mediaAnalysisService.analyzeImage(file.base64, apiKey, 'Analise esta imagem em detalhes em português. Se houver texto, transcreva-o completamente.');
                    if (imageAnalysis.success) {
                        processedMessage = `[IMAGEM ANALISADA]: ${imageAnalysis.content}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                        console.log('[Test AI] Image analyzed successfully');
                    }
                    else {
                        processedMessage = `[Imagem enviada - erro ao analisar]${message ? `\n${message}` : ''}`;
                    }
                }
                catch (error) {
                    console.error('[Test AI] Error analyzing image:', error);
                    processedMessage = `[Imagem enviada]${message ? `\n${message}` : ''}`;
                }
            }
            else if (file.type === 'application/pdf' && apiKey) {
                try {
                    console.log('[Test AI] Processing PDF...');
                    const pdfBuffer = Buffer.from(file.base64, 'base64');
                    const pdfText = await this.pdfService.extractText(pdfBuffer);
                    const textPreview = pdfText.substring(0, 2000);
                    processedMessage = `[DOCUMENTO PDF RECEBIDO - Conteúdo:\n${textPreview}${pdfText.length > 2000 ? '...' : ''}]${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                    console.log('[Test AI] PDF processed successfully');
                }
                catch (error) {
                    console.error('[Test AI] Error processing PDF:', error);
                    processedMessage = `[Documento PDF enviado]${message ? `\n${message}` : ''}`;
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
        if (lead.id) {
            this.leadsService.updateConversationSummary(lead.id).catch(err => {
                console.error('[Test AI] Failed to update conversation summary:', err);
            });
        }
        const history = conversationHistory?.map((msg) => ({
            role: msg.fromMe ? 'assistant' : 'user',
            content: msg.content,
        })) || [];
        history.push({
            role: 'user',
            content: processedMessage,
        });
        const fsmDecision = await this.fsmEngineService.decideNextState({
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
        if (!nextStateInfo) {
            throw new common_1.NotFoundException('No states configured for this agent');
        }
        const knowledgeContext = agent.knowledge.map(k => `${k.title}: ${k.content}`).join('\n');
        const dataRequirement = fsmDecision.dataToExtract
            ? `\n\n[DADO OBRIGATÓRIO PARA COLETAR]: ${fsmDecision.dataToExtract}`
            : '';
        const fsmDirectives = fsmDecision.reasoning.join('\n');
        const agentContext = {
            name: agent.name,
            personality: agent.personality,
            tone: agent.tone,
            instructions: agent.instructions,
            writingStyle: agent.writingStyle,
            prohibitions: agent.prohibitions,
        };
        const systemPrompt = `${agent.systemPrompt || 'Você é um assistente virtual inteligente.'}

# CONTEXTO DO AGENTE
**Nome**: ${agentContext.name}
${agentContext.personality ? `**Personalidade/Traços**: ${agentContext.personality}` : ''}
${agentContext.tone ? `**Tom de Voz**: ${agentContext.tone}` : ''}
${agentContext.instructions ? `**Instruções Específicas**: ${agentContext.instructions}` : ''}
${agentContext.writingStyle ? `**Estilo de Escrita**: ${agentContext.writingStyle}` : ''}
${agentContext.prohibitions ? `**PROIBIÇÕES GLOBAIS**: ${agentContext.prohibitions}` : ''}

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
        let audioBase64 = null;
        if (agent.audioResponseEnabled && userSentAudio && organization.elevenLabsApiKey) {
            try {
                console.log('[Test AI] Generating audio response (user sent audio)...');
                const cleanText = aiResponse.replace(/\\n/g, '\n').replace(/\n/g, '. ');
                const audioBuffer = await this.elevenLabsService.textToSpeech(organization.elevenLabsApiKey, cleanText, organization.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM');
                audioBase64 = audioBuffer.toString('base64');
                console.log('[Test AI] Audio generated successfully, base64 length:', audioBase64.length);
            }
            catch (error) {
                console.error('[Test AI] Error generating audio:', error);
            }
        }
        else if (!agent.audioResponseEnabled && userSentAudio) {
            console.log('[Test AI] Audio response disabled, responding with text even though user sent audio');
        }
        else if (agent.audioResponseEnabled && !userSentAudio) {
            console.log('[Test AI] User sent text, responding with text (mirroring input type)');
        }
        const responseParts = audioBase64
            ? [aiResponse]
            : aiResponse.split(/\n|\\n|\/n/).filter(part => part.trim().length > 0);
        const sentMessages = [];
        if (responseParts.length === 0) {
            responseParts.push(aiResponse);
        }
        for (const part of responseParts) {
            const aiMessage = await this.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    content: part.trim(),
                    fromMe: true,
                    type: 'TEXT',
                    messageId: crypto.randomUUID(),
                    thought: fsmDecision.reasoning.join('\n'),
                },
            });
            sentMessages.push(aiMessage);
        }
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
        console.log('[Test AI] Returning response with audio:', {
            hasAudio: !!audioBase64,
            audioLength: audioBase64?.length || 0
        });
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
            sentMessages: sentMessages.map(m => ({
                id: m.id,
                content: m.content,
                timestamp: m.timestamp,
                thought: fsmDecision.reasoning.join('\n'),
                type: audioBase64 ? 'AUDIO' : 'TEXT',
            })),
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
    async triggerFollowup(organizationId, agentId, userRole, forceIgnoreDelay = true) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new common_1.ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }
        try {
            console.log('[Test AI] Triggering follow-up check...', { forceIgnoreDelay });
            const result = await this.followupsService.checkAgentFollowUps(forceIgnoreDelay);
            console.log('[Test AI] Follow-up check completed:', result);
            return {
                success: true,
                message: `Follow-up verificado! Processados: ${result.processed} de ${result.rulesChecked} regras`,
                stats: result,
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
        openai_service_1.OpenAIService,
        elevenlabs_service_1.ElevenLabsService,
        fsm_engine_service_1.FSMEngineService,
        leads_service_1.LeadsService,
        media_analysis_service_1.MediaAnalysisService,
        pdf_service_1.PdfService,
        followups_service_1.FollowupsService])
], TestAIService);
//# sourceMappingURL=test-ai.service.js.map