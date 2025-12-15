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
exports.AIService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const openai_service_1 = require("./services/openai.service");
const media_analysis_service_1 = require("./services/media-analysis.service");
const message_event_emitter_1 = require("../common/events/message-event.emitter");
let AIService = class AIService {
    prisma;
    openaiService;
    mediaAnalysisService;
    messageEventEmitter;
    constructor(prisma, openaiService, mediaAnalysisService, messageEventEmitter) {
        this.prisma = prisma;
        this.openaiService = openaiService;
        this.mediaAnalysisService = mediaAnalysisService;
        this.messageEventEmitter = messageEventEmitter;
    }
    async processMessage(params) {
        try {
            const context = await this.loadFullContext(params.conversationId, params.organizationId);
            const organization = await this.prisma.organization.findUnique({
                where: { id: params.organizationId },
                select: { openaiApiKey: true, openaiModel: true },
            });
            const apiKey = organization?.openaiApiKey || process.env.OPENAI_API_KEY;
            if (!apiKey)
                throw new Error('OpenAI API Key not found');
            let finalMessage = params.message;
            if (params.media) {
                finalMessage = await this.processMedia(params.media, apiKey, params.message);
            }
            const prompt = this.buildPrompt(context, finalMessage);
            const aiResponse = await this.openaiService.createChatCompletion(apiKey, organization?.openaiModel || 'gpt-4o-mini', [
                { role: 'system', content: 'Você é um assistente de IA que responde de forma natural e humana.' },
                { role: 'user', content: prompt },
            ], { maxTokens: 500 });
            const aiMessage = await this.prisma.message.create({
                data: {
                    conversationId: params.conversationId,
                    content: aiResponse,
                    fromMe: true,
                    type: 'TEXT',
                    messageId: crypto.randomUUID(),
                },
            });
            this.messageEventEmitter.emitMessage(params.conversationId, {
                type: 'new-message',
                message: {
                    id: aiMessage.id,
                    content: aiMessage.content,
                    time: new Date(aiMessage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    sent: true,
                    read: false,
                    role: 'assistant',
                },
            });
            await this.prisma.conversation.update({
                where: { id: params.conversationId },
                data: { updatedAt: new Date() },
            });
            return { response: aiResponse };
        }
        catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }
    async loadFullContext(conversationId, organizationId) {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: {
                messages: { orderBy: { timestamp: 'asc' }, take: 50 },
                lead: true,
                agent: {
                    include: {
                        knowledge: { where: { organizationId }, take: 20 },
                        states: { where: { organizationId }, orderBy: { order: 'asc' } },
                    },
                },
            },
        });
        if (!conversation)
            throw new Error('Conversation not found');
        return conversation;
    }
    async processMedia(media, apiKey, message) {
        try {
            if (media.type.startsWith('audio/')) {
                const transcription = await this.openaiService.transcribeAudio(apiKey, media.base64);
                return `[ÁUDIO TRANSCRITO]: ${transcription}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
            }
            else if (media.type.startsWith('image/')) {
                const result = await this.mediaAnalysisService.analyzeImage(media.base64, apiKey);
                return result.success ? `[IMAGEM]: ${result.content}${message ? `\n${message}` : ''}` : `[IMAGEM]\n${message}`;
            }
            else if (media.type === 'application/pdf') {
                const result = await this.mediaAnalysisService.analyzeDocument(media.base64, media.name || 'documento.pdf', media.type, apiKey);
                return result.success ? `[PDF]: ${result.content}${message ? `\n${message}` : ''}` : `[PDF]\n${message}`;
            }
            else if (media.type.startsWith('video/')) {
                const result = this.mediaAnalysisService.processVideo(media.name);
                return `[${result.content}]\n${message}`;
            }
        }
        catch (error) {
            console.error('Error processing media:', error);
        }
        return message;
    }
    buildPrompt(context, userMessage) {
        const conversationHistory = context.messages.map((m) => `${m.fromMe ? 'Você' : 'Cliente'}: ${m.content}`).join('\n');
        const knowledgeBase = context.agent.knowledge.map((k) => `${k.title}: ${k.content}`).join('\n');
        return `VOCÊ É: ${context.agent.name}
                PERSONALIDADE: ${context.agent.personality || 'Amigável'}
                TOM: ${context.agent.tone}

                INSTRUÇÕES: ${context.agent.systemPrompt || 'Assistente virtual'}

                BASE DE CONHECIMENTO:
                ${knowledgeBase}

                HISTÓRICO:
                ${conversationHistory}

                DADOS DO LEAD:
                Nome: ${context.lead?.name || 'não informado'}
                Email: ${context.lead?.email || 'não informado'}

                MENSAGEM: ${userMessage}

                RESPONDA de forma natural.`;
    }
};
exports.AIService = AIService;
exports.AIService = AIService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_service_1.OpenAIService,
        media_analysis_service_1.MediaAnalysisService,
        message_event_emitter_1.MessageEventEmitter])
], AIService);
//# sourceMappingURL=ai.service.js.map