import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OpenAIService } from './services/openai.service';
import { MediaAnalysisService } from './services/media-analysis.service';
import { MessageEventEmitter } from '../common/events/message-event.emitter';

interface ProcessMessageParams {
    message: string;
    conversationId: string;
    organizationId: string;
    media?: {
        type: string;
        base64: string;
        name?: string;
    };
}

@Injectable()
export class AIService {
    constructor(
        private prisma: PrismaService,
        private openaiService: OpenAIService,
        private mediaAnalysisService: MediaAnalysisService,
        private messageEventEmitter: MessageEventEmitter,
    ) { }

    async processMessage(params: ProcessMessageParams): Promise<{ response: string }> {
        try {
            const context = await this.loadFullContext(params.conversationId, params.organizationId);
            const organization = await this.prisma.organization.findUnique({
                where: { id: params.organizationId },
                select: { openaiApiKey: true, openaiModel: true },
            });

            const apiKey = organization?.openaiApiKey || process.env.OPENAI_API_KEY;
            if (!apiKey) throw new Error('OpenAI API Key not found');

            let finalMessage = params.message;
            if (params.media) {
                finalMessage = await this.processMedia(params.media, apiKey, params.message);
            }

            const prompt = this.buildPrompt(context, finalMessage);
            const aiResponse = await this.openaiService.createChatCompletion(
                apiKey,
                organization?.openaiModel || 'gpt-4o-mini',
                [
                    { role: 'system', content: 'Você é um assistente de IA que responde de forma natural e humana.' },
                    { role: 'user', content: prompt },
                ],
                { maxTokens: 500 }
            );

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
        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    private async loadFullContext(conversationId: string, organizationId: string) {
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

        if (!conversation) throw new Error('Conversation not found');
        return conversation;
    }

    private async processMedia(media: any, apiKey: string, message: string): Promise<string> {
        try {
            if (media.type.startsWith('audio/')) {
                const transcription = await this.openaiService.transcribeAudio(apiKey, media.base64);
                return `[ÁUDIO TRANSCRITO]: ${transcription}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
            } else if (media.type.startsWith('image/')) {
                const result = await this.mediaAnalysisService.analyzeImage(media.base64, apiKey);
                return result.success ? `[IMAGEM]: ${result.content}${message ? `\n${message}` : ''}` : `[IMAGEM]\n${message}`;
            } else if (media.type === 'application/pdf') {
                const result = await this.mediaAnalysisService.analyzeDocument(media.base64, media.name || 'documento.pdf', media.type, apiKey);
                return result.success ? `[PDF]: ${result.content}${message ? `\n${message}` : ''}` : `[PDF]\n${message}`;
            } else if (media.type.startsWith('video/')) {
                const result = this.mediaAnalysisService.processVideo(media.name);
                return `[${result.content}]\n${message}`;
            }
        } catch (error) {
            console.error('Error processing media:', error);
        }
        return message;
    }

    private buildPrompt(context: any, userMessage: string): string {
        const conversationHistory = context.messages.map((m: any) => `${m.fromMe ? 'Você' : 'Cliente'}: ${m.content}`).join('\n');
        const knowledgeBase = context.agent.knowledge.map((k: any) => `${k.title}: ${k.content}`).join('\n');

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
}
