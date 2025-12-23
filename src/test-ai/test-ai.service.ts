import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { OpenAIService } from '../ai/services/openai.service';
import { ElevenLabsService } from '../integrations/elevenlabs/elevenlabs.service';
import { FSMEngineService } from '../ai/fsm-engine/fsm-engine.service';
import { LeadsService } from '../leads/leads.service';
import { MediaAnalysisService } from '../ai/services/media-analysis.service';
import { MediaProcessorService } from '../common/services/media-processor.service';
import { PdfService } from '../common/services/pdf.service';
import { FollowupsService } from '../followups/followups.service';
import { SchedulingService } from '../common/services/scheduling.service';

@Injectable()
export class TestAIService {
    constructor(
        private prisma: PrismaService,
        private openaiService: OpenAIService,
        private elevenLabsService: ElevenLabsService,
        private fsmEngineService: FSMEngineService,
        private leadsService: LeadsService,
        private mediaAnalysisService: MediaAnalysisService,
        private mediaProcessor: MediaProcessorService,
        private pdfService: PdfService,
        private followupsService: FollowupsService,
        private schedulingService: SchedulingService,
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
        let userSentAudio = false; // Track if user sent audio
        if (file) {
            const apiKey = organization.openaiApiKey || process.env.OPENAI_API_KEY;
            if (file.type.startsWith('audio/') && apiKey) {
                userSentAudio = true; // User sent audio
                try {
                    const transcription = await this.openaiService.transcribeAudio(apiKey, file.base64);
                    processedMessage = `[ÁUDIO TRANSCRITO]: ${transcription}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                } catch (error) {
                    console.error('[Test AI] Error transcribing audio:', error);
                    processedMessage = `[Arquivo de áudio enviado]${message ? `\n${message}` : ''}`;
                }
            } else if (file.type.startsWith('image/') && apiKey) {
                try {
                    console.log('[Test AI] Analyzing image...');
                    const imageAnalysis = await this.mediaAnalysisService.analyzeImage(
                        file.base64,
                        apiKey,
                        'Analise esta imagem em detalhes em português. Se houver texto, transcreva-o completamente.'
                    );

                    if (imageAnalysis.success) {
                        processedMessage = `[IMAGEM ANALISADA]: ${imageAnalysis.content}${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                        console.log('[Test AI] Image analyzed successfully');
                    } else {
                        processedMessage = `[Imagem enviada - erro ao analisar]${message ? `\n${message}` : ''}`;
                    }
                } catch (error) {
                    console.error('[Test AI] Error analyzing image:', error);
                    processedMessage = `[Imagem enviada]${message ? `\n${message}` : ''}`;
                }
            } else if (file.type === 'application/pdf' && apiKey) {
                // NEW: PDF processing
                try {
                    console.log('[Test AI] Processing PDF...');
                    const pdfBuffer = Buffer.from(file.base64, 'base64');
                    const pdfText = await this.pdfService.extractText(pdfBuffer);
                    const textPreview = pdfText.substring(0, 2000); // Limit to 2000 chars

                    processedMessage = `[DOCUMENTO PDF RECEBIDO - Conteúdo:\n${textPreview}${pdfText.length > 2000 ? '...' : ''}]${message ? `\n[COMENTÁRIO]: ${message}` : ''}`;
                    console.log('[Test AI] PDF processed successfully');
                } catch (error) {
                    console.error('[Test AI] Error processing PDF:', error);
                    processedMessage = `[Documento PDF enviado]${message ? `\n${message}` : ''}`;
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

        // Generate conversation summary for personalized follow-ups
        if (lead.id) {
            this.leadsService.updateConversationSummary(lead.id).catch(err => {
                console.error('[Test AI] Failed to update conversation summary:', err);
            });
        }

        // Build conversation history for FSM
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
        const fsmDecision = await this.fsmEngineService.decideNextState({
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
        if (!nextStateInfo) {
            throw new NotFoundException('No states configured for this agent');
        }

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

        // Fetch scheduling context if applicable (auto-scheduling)
        const schedulingContext = await this.getSchedulingContext(
            organizationId,
            lead.id,
            agent.id,
            nextStateInfo?.crmStageId
        );

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
${schedulingContext}

DIRETRIZES DO MOTOR DE DECISÃO:
${fsmDirectives}

BASE DE CONHECIMENTO:
${knowledgeContext}

DADOS EXTRAÍDOS DO LEAD:
${JSON.stringify(fsmDecision.extractedData || {}, null, 2)}

DIRETRIZ DE FLUXO E BASE DE CONHECIMENTO:
1. Se o usuário fez uma pergunta, verifique a BASE DE CONHECIMENTO para responder.
2. IMPORTANTE: Se você respondeu uma dúvida usando a Base de Conhecimento, você DEVE, na mesma mensagem, retomar o fluxo da conversa.
3. Não encerre a mensagem apenas com a resposta da dúvida. Sempre termine sua mensagem direcionando o usuário para cumprir a MISSÃO NESTE ESTADO (${nextStateInfo?.missionPrompt}).

Exemplo: "O preço é R$100 (Resposta da dúvida). Agora, sobre seu interesse, qual plano prefere? (Retomada da Missão)"

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

        // Generate audio ONLY if:
        // 1. audioResponseEnabled is active AND
        // 2. User sent audio (mirror input type)
        let audioBase64: string | null = null;
        if (agent.audioResponseEnabled && userSentAudio && organization.elevenLabsApiKey) {
            try {
                console.log('[Test AI] Generating audio response (user sent audio)...');
                // Replace literal \n with actual newlines, then convert to periods for natural speech
                const cleanText = aiResponse.replace(/\\n/g, '\n').replace(/\n/g, '. ');
                const audioBuffer = await this.elevenLabsService.textToSpeech(
                    organization.elevenLabsApiKey,
                    cleanText,
                    organization.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'
                );
                audioBase64 = audioBuffer.toString('base64');
                console.log('[Test AI] Audio generated successfully, base64 length:', audioBase64.length);
            } catch (error) {
                console.error('[Test AI] Error generating audio:', error);
            }
        } else if (!agent.audioResponseEnabled && userSentAudio) {
            console.log('[Test AI] Audio response disabled, responding with text even though user sent audio');
        } else if (agent.audioResponseEnabled && !userSentAudio) {
            console.log('[Test AI] User sent text, responding with text (mirroring input type)');
        }

        // For audio responses, send as single message. For text, can split by paragraphs.
        const responseParts = audioBase64
            ? [aiResponse]
            : aiResponse.split(/\n|\\n|\/n/).filter(part => part.trim().length > 0);
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


        console.log('[Test AI] Returning response with audio:', {
            hasAudio: !!audioBase64,
            audioLength: audioBase64?.length || 0
        });

        console.log('[Test AI] 📎 Media items from state:', {
            stateName: nextStateInfo?.name,
            hasMediaItems: !!nextStateInfo?.mediaItems,
            mediaItemsCount: Array.isArray(nextStateInfo?.mediaItems) ? nextStateInfo?.mediaItems.length : 0,
            mediaTiming: nextStateInfo?.mediaTiming,
            mediaItemsRaw: nextStateInfo?.mediaItems,
        });

        // Process mediaItems to convert Google Drive URLs
        let processedMediaItems: any[] = [];
        if (nextStateInfo?.mediaItems && Array.isArray(nextStateInfo.mediaItems)) {
            processedMediaItems = nextStateInfo.mediaItems.map((item: any) => ({
                ...item,
                url: this.mediaProcessor.convertGoogleDriveUrl(item.url || ''),
            }));
            console.log('[Test AI] 🔗 Converted media URLs:', processedMediaItems.map((m: any) => m.url));
        }

        return {
            response: aiResponse,
            audioBase64,
            thinking: fsmDecision.reasoning.join('\n'),
            state: fsmDecision.nextState,
            extractedData: fsmDecision.extractedData,
            mediaItems: processedMediaItems,
            mediaTiming: nextStateInfo?.mediaTiming || 'after',
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

        // Create a map of debug logs by timestamp for efficient lookup
        // Each debug log corresponds to an AI response, so we can match by AI message content
        const debugLogMap = new Map<string, typeof debugLogs[0]>();
        debugLogs.forEach(log => {
            // Map by response content (first line) for matching
            const responseKey = log.aiResponse?.substring(0, 100) || '';
            debugLogMap.set(responseKey, log);
        });

        const messagesWithThoughts = conversation.messages.map((msg) => {
            let msgState: string | undefined;
            let msgThinking: string | undefined;

            if (msg.fromMe) {
                // For AI messages, find matching debug log by content
                const contentKey = msg.content?.substring(0, 100) || '';
                const matchingLog = debugLogMap.get(contentKey);

                if (matchingLog) {
                    msgState = matchingLog.currentState || lead?.currentState || undefined;
                    msgThinking = msg.thought || matchingLog.aiThinking || undefined;
                } else {
                    // Fallback: try to find by timestamp proximity
                    const msgTime = msg.timestamp.getTime();
                    const closestLog = debugLogs.find(log => {
                        const logTime = log.createdAt.getTime();
                        return Math.abs(logTime - msgTime) < 60000; // Within 1 minute
                    });

                    if (closestLog) {
                        msgState = closestLog.currentState || lead?.currentState || undefined;
                        msgThinking = msg.thought || closestLog.aiThinking || undefined;
                    } else {
                        msgState = lead?.currentState || undefined;
                        msgThinking = msg.thought || undefined;
                    }
                }
            }

            return {
                id: msg.id,
                content: msg.content,
                fromMe: msg.fromMe,
                timestamp: msg.timestamp,
                thinking: msgThinking,
                state: msgState,
                type: msg.type,
            };
        });

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

    async triggerFollowup(organizationId: string, agentId: string, userRole: string, forceIgnoreDelay = true) {
        if (userRole !== 'SUPER_ADMIN') {
            throw new ForbiddenException('Only SUPER_ADMIN can access this endpoint');
        }

        try {
            console.log('[Test AI] Triggering follow-up check...', { forceIgnoreDelay });

            // Call the new follow-up system that filters by CRM stage states
            const result = await this.followupsService.checkAgentFollowUps(forceIgnoreDelay);

            console.log('[Test AI] Follow-up check completed:', result);

            return {
                success: true,
                message: `Follow-up verificado! Processados: ${result.processed} de ${result.rulesChecked} regras`,
                stats: result,
            };
        } catch (error) {
            console.error('[Test AI] Error triggering followup:', error);
            return {
                success: false,
                message: 'Erro ao verificar follow-ups: ' + error.message,
            };
        }
    }

    /**
     * Fetches available scheduling slots for the lead if auto-scheduling is configured
     * Returns formatted string with morning and afternoon slots, or empty string if not applicable
     */
    private async getSchedulingContext(organizationId: string, leadId: string, agentId: string, crmStageId?: string | null): Promise<string> {
        try {
            console.log('[Test AI] 📅 getSchedulingContext called with:', { organizationId, leadId, agentId, crmStageId });

            if (!crmStageId) {
                console.log('[Test AI] 📅 No crmStageId provided, skipping scheduling context');
                return '';
            }

            // Check if this CRM stage has auto-scheduling configured
            const config = await this.prisma.autoSchedulingConfig.findFirst({
                where: {
                    agentId: agentId,
                    crmStageId: crmStageId,
                    isActive: true,
                }
            });

            if (!config) {
                console.log('[Test AI] 📅 No AutoSchedulingConfig found for agentId:', agentId, 'crmStageId:', crmStageId);
                return '';
            }

            console.log('[Test AI] 📅 Auto-scheduling config found, fetching available slots...');

            // Calculate minimum date based on advance hours
            const now = new Date();
            const minAdvanceMs = config.minAdvanceHours * 60 * 60 * 1000;
            const minDate = new Date(now.getTime() + minAdvanceMs);

            // Fetch slots for the next 7 days - show ALL available slots
            const morningSlots: string[] = [];
            const afternoonSlots: string[] = [];

            for (let i = 0; i < 7; i++) {
                const checkDate = new Date(minDate);
                checkDate.setDate(checkDate.getDate() + i);

                const slotDuration = config?.duration || 30;
                const slots = await this.schedulingService.getAvailableSlots(organizationId, checkDate, agentId, slotDuration);

                for (const slot of slots) {
                    if (!slot.available) continue;

                    // Convert UTC time to Brazil time for display (UTC-3)
                    // Use timezone option to get Brazil time
                    const brazilOptions = { timeZone: 'America/Sao_Paulo' };
                    const hour = parseInt(slot.time.toLocaleTimeString('pt-BR', { ...brazilOptions, hour: '2-digit', hour12: false }));
                    const dayName = slot.time.toLocaleDateString('pt-BR', { ...brazilOptions, weekday: 'long' });
                    const dayNum = slot.time.toLocaleDateString('pt-BR', { ...brazilOptions, day: '2-digit', month: '2-digit' });
                    const timeStr = slot.time.toLocaleTimeString('pt-BR', { ...brazilOptions, hour: '2-digit', minute: '2-digit' });
                    const formatted = `${dayName} (${dayNum}) às ${timeStr}`;

                    // Categorize by morning (6-12) or afternoon (12-18)
                    if (hour >= 6 && hour < 12) {
                        morningSlots.push(formatted);
                    } else if (hour >= 12 && hour < 18) {
                        afternoonSlots.push(formatted);
                    }
                }
            }

            if (morningSlots.length === 0 && afternoonSlots.length === 0) {
                console.log('[Test AI] 📅 No available slots found');
                return '';
            }

            const context = `
HORÁRIOS DISPONÍVEIS PARA AGENDAMENTO (tempo real):
${morningSlots.length > 0 ? `- MANHÃ: ${morningSlots.join(', ')}` : '- MANHÃ: Sem horários disponíveis'}
${afternoonSlots.length > 0 ? `- TARDE: ${afternoonSlots.join(', ')}` : '- TARDE: Sem horários disponíveis'}

Ao perguntar se o lead prefere "manhã ou tarde?", considere que estes são os horários reais disponíveis.`;

            console.log('[Test AI] 📅 Scheduling context prepared:', { morningSlots, afternoonSlots });
            return context;

        } catch (error) {
            console.error('[Test AI] Error fetching scheduling context:', error);
            return '';
        }
    }
}
