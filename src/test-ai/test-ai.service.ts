import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FSMEngineService } from '../ai/fsm-engine/fsm-engine.service';
import { OpenAIService } from '../ai/services/openai.service';
import { ElevenLabsService } from '../integrations/elevenlabs/elevenlabs.service';
import { AgentFollowupService } from '../common/services/agent-followup.service';

@Injectable()
export class TestAIService {
    constructor(
        private prisma: PrismaService,
        private fsmEngine: FSMEngineService,
        private openaiService: OpenAIService,
        private elevenLabsService: ElevenLabsService,
        private agentFollowup: AgentFollowupService,
    ) { }

    async processMessage(data: any, userId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }

        const { message, organizationId, agentId, conversationHistory, file } = data;

        if ((!message && !file) || !organizationId || !agentId) {
            throw new ForbiddenException('Message (or File), organizationId, and agentId are required');
        }

        // Get organization and agent
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });

        if (!organization) {
            throw new NotFoundException('Organization not found');
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
            throw new NotFoundException('Agent not found');
        }

        // Create or find test lead
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

        // Create or find test conversation
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

        // Process file if present (audio transcription)
        let processedMessage = message || '';
        if (file) {
            const apiKey = organization.openaiApiKey || process.env.OPENAI_API_KEY;
            if (file.type.startsWith('audio/') && apiKey) {
                try {
                    const transcription = await this.openaiService.transcribeAudio(apiKey, file.base64);
                    processedMessage = `[ÁUDIO TRANSCRITO]: ${transcription}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                } catch (error) {
                    console.error('[Test AI] Error transcribing audio:', error);
                    processedMessage = `[Arquivo de áudio enviado]${message ? `\n${message}` : ''}`;
                }
            } else {
                processedMessage = `[Arquivo]: ${file.name}${message ? `\n${message}` : ''}`;
            }
        }

        // Save user message
        await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: processedMessage,
                fromMe: false,
                type: file ? (file.type.startsWith('audio') ? 'AUDIO' : 'DOCUMENT') : 'TEXT',
                messageId: crypto.randomUUID(),
            },
        });

        // Get current state details
        const currentState = agent.states?.find(s => s.name === lead.currentState) || agent.states?.[0];
        if (!currentState) {
            throw new NotFoundException('No states configured for this agent');
        }

        // Build conversation history for AI
        const history = conversationHistory?.map((msg: any) => ({
            role: msg.fromMe ? 'assistant' : 'user',
            content: msg.content,
        })) || [];

        // Add current message
        history.push({
            role: 'user',
            content: processedMessage,
        });

        // Use FSM Engine to decide next state
        const fsmDecision = await this.fsmEngine.decideNextState({
            agentId: agent.id,
            currentState: lead.currentState || 'INICIO',
            lastMessage: processedMessage,
            extractedData: (lead.extractedData as unknown as Record<string, any>) || {},
            conversationHistory: history,
            leadId: lead.id,
            organizationId,
        });

        // Update lead with new state and extracted data
        await this.prisma.lead.update({
            where: { id: lead.id },
            data: {
                currentState: fsmDecision.nextState,
                extractedData: fsmDecision.extractedData,
            },
        });

        // Get updated state details for response generation
        const nextStateInfo = agent.states?.find(s => s.name === fsmDecision.nextState) || agent.states?.[0];

        // Build system prompt with FSM context for response generation
        const knowledgeContext = agent.knowledge.map(k => `${k.title}: ${k.content}`).join('\n');

        // Include Data To Extract requirement if present
        const dataRequirement = fsmDecision.dataToExtract
            ? `\n\n[DADO OBRIGATÓRIO PARA COLETAR]: ${fsmDecision.dataToExtract}`
            : '';

        // Add explicit directive from FSM reasoning
        const fsmDirectives = fsmDecision.reasoning.join('\n');

        // Construct full agent context
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

        // Get AI response using the Logic-Driven context
        const apiKey = organization.openaiApiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OpenAI API Key not configured');
        }

        const aiResponse = await this.openaiService.createChatCompletion(
            apiKey,
            organization.openaiModel || 'gpt-4o-mini',
            [
                { role: 'system', content: systemPrompt },
                ...history,
            ],
            { maxTokens: 500 }
        );

        const responseParts = aiResponse.split(/\n|\\n|\/n/).filter(part => part.trim().length > 0);
        const sentMessages: any[] = [];

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
                    thought: fsmDecision.reasoning.join('\n'), // Attach thought to all parts or just first? All is fine.
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

        let audioBase64: string | null = null;
        if (agent.audioResponseEnabled && organization.elevenLabsApiKey) {
            try {
                const audioBuffer = await this.elevenLabsService.textToSpeech(
                    aiResponse.replace(/\n/g, '. '),
                    organization.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM',
                    organization.elevenLabsApiKey
                );
                audioBase64 = audioBuffer.toString('base64');
            } catch (error) {
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
            sentMessages: sentMessages.map(m => ({
                id: m.id,
                content: m.content,
                timestamp: m.timestamp,
                thought: fsmDecision.reasoning.join('\n'),
                type: 'TEXT',
            })),
        };
    }

    async getHistory(organizationId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
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

    async resetConversation(organizationId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
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

    async triggerFollowup(organizationId: string, agentId: string, userRole: string) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
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
        } catch (error) {
            console.error('[Test AI] Error triggering followup:', error);
            return {
                success: false,
                message: 'Erro ao verificar follow-ups: ' + error.message,
            };
        }
    }
}
