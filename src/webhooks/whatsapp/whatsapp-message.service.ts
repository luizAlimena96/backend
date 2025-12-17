import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { FSMEngineService } from '../../ai/fsm-engine/fsm-engine.service';
import { OpenAIService } from '../../ai/services/openai.service';
import { WhatsAppIntegrationService } from '../../integrations/whatsapp/whatsapp-integration.service';
import { LeadsService } from '../../leads/leads.service';
import { HttpService } from '@nestjs/axios';
import { StorageService } from '../../common/services/storage.service';
import { PdfService } from '../../common/services/pdf.service';
import { ElevenLabsService } from '../../integrations/elevenlabs/elevenlabs.service';
import { MediaProcessorService } from '../../common/services/media-processor.service';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WhatsAppMessageService {
    constructor(
        private prisma: PrismaService,
        private fsmEngine: FSMEngineService,
        private openaiService: OpenAIService,
        private whatsappService: WhatsAppIntegrationService,
        private leadsService: LeadsService,
        private httpService: HttpService,
        private storageService: StorageService,
        private pdfService: PdfService,
        private elevenLabsService: ElevenLabsService,
        private mediaProcessor: MediaProcessorService,
    ) { }

    async processIncomingMessage(webhookData: any): Promise<void> {
        try {
            const data = webhookData.data;
            const instanceName = webhookData.instance;
            const phone = data.key.remoteJid.replace("@s.whatsapp.net", "");

            // Extract message content from different message types
            let messageContent =
                data.message?.conversation ||
                data.message?.extendedTextMessage?.text ||
                data.message?.imageMessage?.caption ||
                data.message?.videoMessage?.caption ||
                '';

            // Process media for AI context
            const hasImage = !!data.message?.imageMessage;
            const hasAudio = !!data.message?.audioMessage;
            const hasDocument = !!data.message?.documentMessage;

            // Track if user sent audio to respond in same format
            let userSentAudio = false;

            if (hasAudio) {
                userSentAudio = true;
                console.log('[WhatsApp] 🎤 Audio message detected');
                try {
                    const audioMessage = data.message.audioMessage;
                    console.log('[WhatsApp] Audio message details:', {
                        mimetype: audioMessage.mimetype,
                        seconds: audioMessage.seconds,
                        ptt: audioMessage.ptt, // Push-to-talk (voice message)
                        hasUrl: !!audioMessage.url
                    });

                    const audioUrl = audioMessage.url;
                    console.log('[WhatsApp] Audio URL:', audioUrl);

                    if (audioUrl) {
                        // Download audio
                        console.log('[WhatsApp] Downloading audio...');
                        const response = await firstValueFrom(
                            this.httpService.get(audioUrl, { responseType: 'arraybuffer' })
                        );
                        const audioBuffer = Buffer.from(response.data);
                        console.log('[WhatsApp] ✅ Audio downloaded, size:', audioBuffer.length, 'bytes');

                        // Save audio
                        const fileName = `${data.key.id}.ogg`;
                        const savedPath = await this.storageService.saveFile(audioBuffer, fileName, 'audio/ogg');
                        console.log('[WhatsApp] 💾 Audio saved to:', savedPath);
                        console.log('[WhatsApp] 📁 Full path for inspection:', `${process.cwd()}/${savedPath}`);

                        // Transcribe audio using Whisper
                        const apiKey = process.env.OPENAI_API_KEY;
                        if (apiKey) {
                            console.log('[WhatsApp] 🔄 Starting Whisper transcription...');

                            // Convert to base64 as expected by transcribeAudio (legacy approach)
                            const base64Audio = audioBuffer.toString('base64');
                            const transcription = await this.openaiService.transcribeAudio(apiKey, base64Audio);
                            console.log('[WhatsApp] ✅ Transcription completed:', transcription);
                            console.log('[WhatsApp] Transcription length:', transcription.length, 'characters');

                            messageContent += `\n\n[ÁUDIO RECEBIDO - Transcrição: "${transcription}"]`;
                        } else {
                            console.log('[WhatsApp] ⚠️ No OpenAI API key for transcription');
                            messageContent += '\n\n[ÁUDIO RECEBIDO - Transcrição não disponível]';
                        }
                    }
                } catch (error) {
                    console.error('[WhatsApp] ❌ Error processing audio:', error);
                    messageContent += '\n\n[ÁUDIO RECEBIDO - Erro ao processar]';
                }
            }

            if (hasImage) {
                try {
                    const imageMessage = data.message.imageMessage;
                    const imageUrl = imageMessage.url;

                    if (imageUrl) {
                        // Download image
                        const response = await firstValueFrom(
                            this.httpService.get(imageUrl, { responseType: 'arraybuffer' })
                        );
                        const imageBuffer = Buffer.from(response.data);

                        // Save image
                        const fileName = `${data.key.id}.jpg`;
                        const savedPath = await this.storageService.saveFile(imageBuffer, fileName, 'image/jpeg');

                        // Use OpenAI Vision to describe the image
                        const apiKey = process.env.OPENAI_API_KEY;
                        if (apiKey) {
                            const imageDescription = await this.openaiService.analyzeImage(
                                apiKey,
                                imageBuffer,
                                'Descreva esta imagem em detalhes para que eu possa entender o contexto.'
                            );
                            messageContent += `\n\n[IMAGEM RECEBIDA - Descrição: ${imageDescription}]`;
                        } else {
                            messageContent += '\n\n[IMAGEM RECEBIDA - Análise não disponível]';
                        }
                    }
                } catch (error) {
                    console.error('[WhatsApp] Error processing image:', error);
                    messageContent += '\n\n[IMAGEM RECEBIDA - Erro ao processar]';
                }
            }

            if (hasDocument) {
                try {
                    const documentMessage = data.message.documentMessage;
                    const documentUrl = documentMessage.url;
                    const mimeType = documentMessage.mimetype;

                    if (documentUrl && mimeType === 'application/pdf') {
                        // Download PDF
                        const response = await firstValueFrom(
                            this.httpService.get(documentUrl, { responseType: 'arraybuffer' })
                        );
                        const pdfBuffer = Buffer.from(response.data);

                        // Save PDF
                        const fileName = `${data.key.id}.pdf`;
                        await this.storageService.saveFile(pdfBuffer, fileName, mimeType);

                        // Extract text from PDF
                        const pdfText = await this.pdfService.extractText(pdfBuffer);
                        const textPreview = pdfText.substring(0, 2000); // Limit to 2000 chars
                        messageContent += `\n\n[DOCUMENTO PDF RECEBIDO - Conteúdo:\n${textPreview}${pdfText.length > 2000 ? '...' : ''}]`;
                    } else {
                        messageContent += `\n\n[DOCUMENTO RECEBIDO - Tipo: ${mimeType}]`;
                    }
                } catch (error) {
                    console.error('[WhatsApp] Error processing document:', error);
                    messageContent += '\n\n[DOCUMENTO RECEBIDO - Erro ao processar]';
                }
            }

            if (!messageContent) {
                console.log('[WhatsApp] No text content in message, skipping');
                return;
            }

            // 1. Find agent by instance
            const agent = await this.prisma.agent.findUnique({
                where: { instance: instanceName },
                include: {
                    organization: true,
                    states: { orderBy: { order: 'asc' } },
                    knowledge: true,
                },
            });

            if (!agent) {
                console.error('[WhatsApp] Agent not found for instance:', instanceName);
                return;
            }

            // 2. Find or create lead
            let lead = await this.prisma.lead.findFirst({
                where: {
                    phone,
                    organizationId: agent.organizationId,
                },
            });

            if (!lead) {
                lead = await this.prisma.lead.create({
                    data: {
                        phone,
                        name: data.pushName || phone,
                        status: 'NEW',
                        currentState: agent.states?.[0]?.name || 'INICIO',
                        agentId: agent.id,
                        organizationId: agent.organizationId,
                        extractedData: {},
                    },
                });
                console.log('[WhatsApp] Created new lead:', lead.id);
            }

            // 3. Find or create conversation
            let conversation = await this.prisma.conversation.findFirst({
                where: {
                    whatsapp: phone,
                    organizationId: agent.organizationId,
                },
            });

            if (!conversation) {
                conversation = await this.prisma.conversation.create({
                    data: {
                        whatsapp: phone,
                        leadId: lead.id,
                        agentId: agent.id,
                        organizationId: agent.organizationId,
                    },
                });
                console.log('[WhatsApp] Created new conversation:', conversation.id);
            }

            // 4. Save user message
            await this.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    content: messageContent,
                    fromMe: false,
                    type: 'TEXT',
                    messageId: data.key.id,
                },
            });

            // 5. Generate conversation summary in background
            this.leadsService.updateConversationSummary(lead.id).catch(err => {
                console.error('[WhatsApp] Failed to update conversation summary:', err);
            });

            // 6. Get conversation history
            const conversationHistory = await this.getConversationHistory(conversation.id);

            // 7. Process with FSM Engine
            const fsmDecision = await this.fsmEngine.decideNextState({
                agentId: agent.id,
                currentState: lead.currentState || 'INICIO',
                lastMessage: messageContent,
                extractedData: (lead.extractedData as any) || {},
                conversationHistory,
                leadId: lead.id,
                organizationId: agent.organizationId,
            });

            // 8. Update lead with new state and data
            await this.prisma.lead.update({
                where: { id: lead.id },
                data: {
                    currentState: fsmDecision.nextState,
                    extractedData: fsmDecision.extractedData,
                },
            });

            // 9. Get next state details
            const nextState = agent.states?.find(s => s.name === fsmDecision.nextState);

            // 10. Build system prompt
            const systemPrompt = this.buildSystemPrompt(agent, nextState, fsmDecision);

            // 11. Generate AI response
            const apiKey = agent.organization.openaiApiKey || process.env.OPENAI_API_KEY;
            if (!apiKey) {
                console.error('[WhatsApp] No OpenAI API key configured');
                return;
            }

            const aiResponse = await this.openaiService.createChatCompletion(
                apiKey,
                agent.organization.openaiModel || 'gpt-4o-mini',
                [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory,
                ],
                { maxTokens: 500 }
            );

            // 12. Process and send state media items (if any)
            const stateMediaItems = nextState?.mediaItems as any[] || [];
            const mediaTiming = nextState?.mediaTiming || 'after'; // default to 'after'

            // Helper function to send media items
            const sendMediaItems = async () => {
                if (stateMediaItems.length > 0) {
                    console.log(`[WhatsApp] 📎 Processing ${stateMediaItems.length} media item(s) from state`);

                    for (const mediaItem of stateMediaItems) {
                        try {
                            const { url, type, caption, fileName } = mediaItem;

                            // Process URL (convert Google Drive if needed)
                            const processedMedia = await this.mediaProcessor.processMediaUrl(url, {
                                type: type || undefined
                            });

                            console.log(`[WhatsApp] 📤 Sending ${processedMedia.type}: ${processedMedia.fileName}`);

                            // Send based on media type
                            switch (processedMedia.type) {
                                case 'image':
                                    await this.whatsappService.sendImage(
                                        instanceName,
                                        phone,
                                        processedMedia.url,
                                        caption
                                    );
                                    break;
                                case 'video':
                                    await this.whatsappService.sendVideo(
                                        instanceName,
                                        phone,
                                        processedMedia.url,
                                        caption
                                    );
                                    break;
                                case 'document':
                                    await this.whatsappService.sendDocument(
                                        instanceName,
                                        phone,
                                        processedMedia.url,
                                        fileName || processedMedia.fileName,
                                        caption
                                    );
                                    break;
                                case 'audio':
                                    await this.whatsappService.sendAudio(
                                        instanceName,
                                        phone,
                                        processedMedia.url
                                    );
                                    break;
                            }

                            console.log(`[WhatsApp] ✅ Sent ${processedMedia.type} successfully`);
                        } catch (error) {
                            console.error('[WhatsApp] ❌ Error sending media item:', error);
                            // Continue with next media item even if one fails
                        }
                    }
                }
            };

            // Send media based on timing
            if (mediaTiming === 'before') {
                await sendMediaItems();
            }

            // 13. Split response into parts (if needed) - only if not 'only' timing
            const shouldSendText = mediaTiming !== 'only';

            if (shouldSendText) {
                const responseParts = aiResponse.split(/\n|\\\n|\/n/).filter(part => part.trim().length > 0);
                if (responseParts.length === 0) {
                    responseParts.push(aiResponse);
                }

                // 14. Save and send each part
                for (const part of responseParts) {
                    const trimmedPart = part.trim();

                    // Debug: Check ElevenLabs credentials
                    console.log('[WhatsApp] Debug - audioResponseEnabled:', agent.audioResponseEnabled);
                    console.log('[WhatsApp] Debug - elevenLabsApiKey:', agent.organization.elevenLabsApiKey ? 'EXISTS' : 'MISSING');
                    console.log('[WhatsApp] Debug - elevenLabsVoiceId:', agent.organization.elevenLabsVoiceId ? 'EXISTS' : 'MISSING');
                    console.log('[WhatsApp] Debug - userSentAudio:', userSentAudio);

                    // Decide if we should respond with audio
                    // Send audio ONLY if:
                    // 1. audioResponseEnabled is true AND
                    // 2. User sent audio (mirror input type) AND
                    // 3. Credentials exist
                    const shouldSendAudio = agent.audioResponseEnabled &&
                        userSentAudio &&
                        agent.organization.elevenLabsApiKey &&
                        agent.organization.elevenLabsVoiceId;

                    console.log('[WhatsApp] Debug - shouldSendAudio:', shouldSendAudio);

                    if (shouldSendAudio) {
                        try {
                            // Generate audio using ElevenLabs
                            // Non-null assertion is safe because shouldSendAudio checks for existence
                            const audioBuffer = await this.elevenLabsService.textToSpeech(
                                agent.organization.elevenLabsApiKey!,
                                trimmedPart,
                                agent.organization.elevenLabsVoiceId!
                            );

                            // Save audio file
                            const audioFileName = `response-${crypto.randomUUID()}.mp3`;
                            const audioPath = await this.storageService.saveFile(audioBuffer, audioFileName, 'audio/mpeg');

                            // Build full URL for WhatsApp (Evolution API needs accessible URL)
                            const fullAudioUrl = process.env.BACKEND_URL
                                ? `${process.env.BACKEND_URL}${audioPath}`
                                : audioPath;

                            // Send ONLY audio via WhatsApp
                            await this.whatsappService.sendMedia(instanceName, phone, fullAudioUrl, trimmedPart);

                            // Save audio message to database
                            await this.prisma.message.create({
                                data: {
                                    conversationId: conversation.id,
                                    content: trimmedPart,
                                    fromMe: true,
                                    type: 'TEXT',
                                    messageId: crypto.randomUUID(),
                                    thought: fsmDecision.reasoning.join('\n'),
                                },
                            });

                            console.log('[WhatsApp] Sent audio response via ElevenLabs');
                        } catch (error) {
                            console.error('[WhatsApp] TTS failed, falling back to text:', error);

                            // Fallback: send as text
                            await this.prisma.message.create({
                                data: {
                                    conversationId: conversation.id,
                                    content: trimmedPart,
                                    fromMe: true,
                                    type: 'TEXT',
                                    messageId: crypto.randomUUID(),
                                    thought: fsmDecision.reasoning.join('\n'),
                                },
                            });
                            await this.whatsappService.sendMessage(instanceName, phone, trimmedPart);
                        }
                    } else {
                        // Send ONLY text
                        await this.prisma.message.create({
                            data: {
                                conversationId: conversation.id,
                                content: trimmedPart,
                                fromMe: true,
                                type: 'TEXT',
                                messageId: crypto.randomUUID(),
                                thought: fsmDecision.reasoning.join('\n'),
                            },
                        });

                        await this.whatsappService.sendMessage(instanceName, phone, trimmedPart);
                    }
                }
            }

            // Send media after text if timing is 'after' (default) or 'only'
            if (mediaTiming === 'after' || mediaTiming === 'only') {
                await sendMediaItems();
            }

            console.log(`[WhatsApp] ✅ Processed message from ${phone}`);
        } catch (error) {
            console.error('[WhatsApp] Error processing message:', error);
            throw error;
        }
    }

    private async getConversationHistory(conversationId: string): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
        const messages = await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'asc' },
            take: 20,
        });

        return messages.map(m => ({
            role: m.fromMe ? 'assistant' : 'user',
            content: m.content,
        }));
    }

    private buildSystemPrompt(agent: any, state: any, fsmDecision: any): string {
        const knowledgeContext = agent.knowledge
            .map((k: any) => `${k.title}: ${k.content}`)
            .join('\n');

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

        return `${agent.systemPrompt || 'Você é um assistente virtual inteligente.'}

# CONTEXTO DO AGENTE
**Nome**: ${agentContext.name}
${agentContext.personality ? `**Personalidade/Traços**: ${agentContext.personality}` : ''}
${agentContext.tone ? `**Tom de Voz**: ${agentContext.tone}` : ''}
${agentContext.instructions ? `**Instruções Específicas**: ${agentContext.instructions}` : ''}
${agentContext.writingStyle ? `**Estilo de Escrita**: ${agentContext.writingStyle}` : ''}
${agentContext.prohibitions ? `**PROIBIÇÕES GLOBAIS**: ${agentContext.prohibitions}` : ''}

ESTADO ATUAL: ${state?.name}
MISSÃO NESTE ESTADO: ${state?.missionPrompt}${dataRequirement}

DIRETRIZES DO MOTOR DE DECISÃO:
${fsmDirectives}

BASE DE CONHECIMENTO:
${knowledgeContext}

DADOS EXTRAÍDOS DO LEAD:
${JSON.stringify(fsmDecision.extractedData || {}, null, 2)}

Responda de forma natural e ajude o usuário conforme a missão do estado atual.`;
    }
}
