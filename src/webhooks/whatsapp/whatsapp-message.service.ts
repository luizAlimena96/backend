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
import { CrmAutomationsService } from '../../crm-automations/crm-automations.service';
import { SchedulingService } from '../../common/services/scheduling.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
        private crmEngine: CrmAutomationsService,
        private schedulingService: SchedulingService,
        private eventEmitter: EventEmitter2,
    ) { }

    async processIncomingMessage(webhookData: any): Promise<void> {
        try {
            const data = webhookData.data;
            const instanceName = webhookData.instance;
            const remoteJid = data.key.remoteJid;

            // Ignore group messages (groups end with @g.us)
            if (remoteJid.endsWith('@g.us')) {
                console.log('[WhatsApp] Ignoring group message from:', remoteJid);
                return;
            }

            const phone = remoteJid.replace("@s.whatsapp.net", "");

            // 1. Find organization FIRST (needed for OpenAI API key for transcription)
            const organization: any = await this.prisma.organization.findFirst({
                where: { evolutionInstanceName: instanceName },
                include: {
                    agents: {
                        include: {
                            states: { orderBy: { order: 'asc' } },
                            knowledge: true,
                        },
                        take: 1,
                    },
                },
            });

            if (!organization || !organization.agents || organization.agents.length === 0) {
                console.error('[WhatsApp] No agent found for organization with instance:', instanceName);
                return;
            }

            const agent: any = organization.agents[0];
            agent.organization = organization;

            // Get OpenAI API key from organization
            const organizationApiKey = organization.openaiApiKey;


            // Extract message content from different message types
            let messageContent =
                data.message?.conversation ||
                data.message?.extendedTextMessage?.text ||
                data.message?.imageMessage?.caption ||
                data.message?.videoMessage?.caption ||
                '';

            // ==========================================
            // #RESET COMMAND - Reset conversation state
            // ==========================================
            if (messageContent.trim().toLowerCase() === '#reset') {
                console.log(`[WhatsApp] 🔄 Reset command received from ${phone}`);

                try {
                    // Find existing conversation and lead for this phone
                    const existingConversation = await this.prisma.conversation.findFirst({
                        where: {
                            whatsapp: phone,
                            organizationId: organization.id,
                        },
                    });

                    if (existingConversation) {
                        // Delete all messages from this conversation
                        await this.prisma.message.deleteMany({
                            where: { conversationId: existingConversation.id },
                        });

                        // Delete debug logs if exists
                        await this.prisma.debugLog.deleteMany({
                            where: { conversationId: existingConversation.id },
                        });

                        // Delete the conversation itself
                        await this.prisma.conversation.delete({
                            where: { id: existingConversation.id },
                        });

                        console.log(`[WhatsApp] ✅ Deleted conversation ${existingConversation.id}`);
                    }

                    // Find and DELETE lead completely (for clean testing)
                    const existingLead = await this.prisma.lead.findFirst({
                        where: {
                            phone,
                            organizationId: organization.id,
                        },
                    });

                    if (existingLead) {
                        // Delete lead completely from database
                        await this.prisma.lead.delete({
                            where: { id: existingLead.id },
                        });
                        console.log(`[WhatsApp] ✅ Deleted lead ${existingLead.id} completely`);
                    }

                    // Send confirmation message
                    await this.whatsappService.sendMessage(
                        instanceName,
                        phone,
                        '🔄 Conversa reiniciada! Envie uma mensagem para começar novamente.'
                    );

                    console.log(`[WhatsApp] ✅ Reset complete for ${phone}`);
                } catch (error) {
                    console.error('[WhatsApp] ❌ Error processing reset:', error);
                    await this.whatsappService.sendMessage(
                        instanceName,
                        phone,
                        '❌ Erro ao reiniciar conversa. Tente novamente.'
                    );
                }

                return; // Stop processing - don't continue with normal flow
            }

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

                    // Use Evolution API to get decrypted base64 audio
                    const messageKeyId = data.key.id;
                    console.log('[WhatsApp] Getting decrypted audio from Evolution API, keyId:', messageKeyId);
                    const mediaResult = await this.whatsappService.getBase64FromMediaMessage(instanceName, messageKeyId);

                    if (mediaResult?.base64) {
                        console.log('[WhatsApp] ✅ Got decrypted audio, size:', mediaResult.base64.length, 'chars');
                        console.log('[WhatsApp] Audio mimetype:', mediaResult.mimetype);

                        // Save audio from base64
                        const audioBuffer = Buffer.from(mediaResult.base64, 'base64');
                        const fileName = `${data.key.id}.ogg`;
                        const savedPath = await this.storageService.saveFile(audioBuffer, fileName, mediaResult.mimetype || 'audio/ogg');
                        console.log('[WhatsApp] 💾 Audio saved to:', savedPath);

                        // Transcribe audio using Whisper (using organization's API key)
                        if (organizationApiKey) {
                            console.log('[WhatsApp] 🔄 Starting Whisper transcription...');
                            const transcription = await this.openaiService.transcribeAudio(organizationApiKey, mediaResult.base64);
                            console.log('[WhatsApp] ✅ Transcription completed:', transcription);
                            console.log('[WhatsApp] Transcription length:', transcription.length, 'characters');

                            messageContent += `\n\n[ÁUDIO RECEBIDO - Transcrição: "${transcription}"]`;
                        } else {
                            console.log('[WhatsApp] ⚠️ No OpenAI API key for transcription');
                            messageContent += '\n\n[ÁUDIO RECEBIDO - Transcrição não disponível]';
                        }
                    } else {
                        console.log('[WhatsApp] ⚠️ Could not get base64 from Evolution API');
                        messageContent += '\n\n[ÁUDIO RECEBIDO - Não foi possível processar]';
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
                            this.httpService.get(imageUrl, {
                                responseType: 'arraybuffer',
                                timeout: 30000,
                            })
                        );
                        const imageBuffer = Buffer.from(response.data);

                        // Save image
                        const fileName = `${data.key.id}.jpg`;
                        const savedPath = await this.storageService.saveFile(imageBuffer, fileName, 'image/jpeg');

                        // Use OpenAI Vision to describe the image (using organization's API key)
                        if (organizationApiKey) {
                            const imageDescription = await this.openaiService.analyzeImage(
                                organizationApiKey,
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
                            this.httpService.get(documentUrl, {
                                responseType: 'arraybuffer',
                                timeout: 30000,
                            })
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

            // Organization and agent already loaded at the start of the function

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
            const userMessage = await this.prisma.message.create({
                data: {
                    conversationId: conversation.id,
                    content: messageContent,
                    fromMe: false,
                    type: 'TEXT',
                    messageId: data.key.id,
                },
            });

            // Emit incoming message event
            this.eventEmitter.emit('conversation.message', {
                conversationId: conversation.id,
                message: {
                    id: userMessage.id,
                    content: userMessage.content,
                    time: userMessage.timestamp,
                    sent: false,
                    read: true,
                    role: 'user',
                    type: 'TEXT',
                    messageId: data.key.id
                }
            });

            // Trigger MESSAGE_RECEIVED Automation
            this.crmEngine.trigger('MESSAGE_RECEIVED', {
                organizationId: agent.organizationId,
                leadId: lead.id,
                data: {
                    content: messageContent,
                    conversationId: conversation.id
                }
            });

            // 5. Generate conversation summary in background
            this.leadsService.updateConversationSummary(lead.id).catch(err => {
                console.error('[WhatsApp] Failed to update conversation summary:', err);
            });

            // 6. Get conversation history
            const conversationHistory = await this.getConversationHistory(conversation.id);

            // 7. Process with FSM Engine
            const previousState = lead.currentState || 'INICIO';
            const fsmDecision = await this.fsmEngine.decideNextState({
                agentId: agent.id,
                currentState: previousState,
                lastMessage: messageContent,
                extractedData: (lead.extractedData as any) || {},
                conversationHistory,
                leadId: lead.id,
                organizationId: agent.organizationId,
            });

            // Check if state changed (not persistence route)
            const stateChanged = previousState !== fsmDecision.nextState;
            console.log(`[WhatsApp] 📊 State transition: ${previousState} → ${fsmDecision.nextState} (changed: ${stateChanged})`);

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

            // DEBUG: Log state media info
            console.log('[WhatsApp] 🔍 DEBUG - State media check:', {
                nextStateName: fsmDecision.nextState,
                stateFound: !!nextState,
                stateId: nextState?.id,
                hasMediaItems: !!nextState?.mediaItems,
                mediaItemsType: typeof nextState?.mediaItems,
                mediaItemsRaw: nextState?.mediaItems,
                mediaTiming: nextState?.mediaTiming,
                allStatesCount: agent.states?.length,
            });

            // 10. Fetch scheduling context if applicable (auto-scheduling)
            const schedulingContext = await this.getSchedulingContext(
                agent.organizationId,
                lead.id,
                agent.id,
                nextState?.crmStageId
            );

            // 11. Build system prompt
            const systemPrompt = this.buildSystemPrompt(agent, nextState, fsmDecision, schedulingContext);

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
            // IMPORTANT: Only send media on state TRANSITION (first entry), not on persistence route
            // Parse mediaItems - it might be a string if stored as JSON
            let stateMediaItems: any[] = [];
            if (nextState?.mediaItems && stateChanged) {
                // Only process media if state actually changed (not persistence route)
                if (typeof nextState.mediaItems === 'string') {
                    try {
                        stateMediaItems = JSON.parse(nextState.mediaItems);
                    } catch (e) {
                        console.error('[WhatsApp] ❌ Failed to parse mediaItems as JSON:', e);
                    }
                } else if (Array.isArray(nextState.mediaItems)) {
                    stateMediaItems = nextState.mediaItems;
                } else {
                    console.warn('[WhatsApp] ⚠️ mediaItems is neither string nor array:', typeof nextState.mediaItems);
                }
            } else if (nextState?.mediaItems && !stateChanged) {
                console.log('[WhatsApp] 📎 Skipping media - persistence route (state unchanged)');
            }

            const mediaTiming = nextState?.mediaTiming || 'after'; // default to 'after'

            console.log('[WhatsApp] 📎 DEBUG - Media items to process:', {
                count: stateMediaItems.length,
                items: stateMediaItems,
                timing: mediaTiming,
                stateChanged: stateChanged,
            });

            // Helper function to send media items
            const sendMediaItems = async () => {
                if (stateMediaItems.length > 0) {
                    console.log(`[WhatsApp] 📎 Processing ${stateMediaItems.length} media item(s) from state`);

                    for (const mediaItem of stateMediaItems) {
                        try {
                            const { url, type, caption, fileName } = mediaItem;

                            // Detect media type first
                            const detectedType = type || this.mediaProcessor.detectMediaType(url);

                            // For videos: Use URL directly (base64 causes 500 errors with large files)
                            // For other types: Convert to base64 for reliability
                            const shouldUseBase64 = detectedType !== 'video';

                            console.log(`[WhatsApp] 📎 Processing ${detectedType} - Using ${shouldUseBase64 ? 'Base64' : 'URL'}`);

                            // Process URL (convert Google Drive if needed)
                            const processedMedia = await this.mediaProcessor.processMediaUrl(url, {
                                type: detectedType,
                                convertToBase64: shouldUseBase64
                            });

                            console.log(`[WhatsApp] 📤 Sending ${processedMedia.type}: ${processedMedia.fileName}`);

                            // Construct payload: base64 Data URI for images/docs, URL for videos
                            const mediaPayload = processedMedia.base64
                                ? `data:${processedMedia.mimeType};base64,${processedMedia.base64}`
                                : processedMedia.url;

                            // Send based on media type
                            switch (processedMedia.type) {
                                case 'image':
                                    await this.whatsappService.sendImage(
                                        instanceName,
                                        phone,
                                        mediaPayload,
                                        caption
                                    );
                                    break;
                                case 'video':
                                    // Videos always use URL (not base64) to avoid 500 errors
                                    // URL format: https://drive.google.com/uc?export=download&id=...
                                    console.log(`[WhatsApp] 🎬 Sending video via URL: ${processedMedia.url}`);
                                    await this.whatsappService.sendVideo(
                                        instanceName,
                                        phone,
                                        processedMedia.url, // Always use URL for videos
                                        caption
                                    );
                                    break;
                                case 'document':
                                    await this.whatsappService.sendDocument(
                                        instanceName,
                                        phone,
                                        mediaPayload,
                                        fileName || processedMedia.fileName,
                                        caption
                                    );
                                    break;
                                case 'audio':
                                    await this.whatsappService.sendAudio(
                                        instanceName,
                                        phone,
                                        mediaPayload
                                    );
                                    break;
                            }

                            console.log(`[WhatsApp] ✅ Sent ${processedMedia.type} successfully (Base64: ${!!processedMedia.base64})`);
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

                            // Save audio file (optional, for logging/debugging)
                            const audioFileName = `response-${crypto.randomUUID()}.mp3`;
                            await this.storageService.saveFile(audioBuffer, audioFileName, 'audio/mpeg');
                            console.log('[WhatsApp] Audio saved locally:', audioFileName);

                            // Convert audio to base64 for Evolution API
                            const audioBase64 = audioBuffer.toString('base64');
                            console.log('[WhatsApp] Audio base64 length:', audioBase64.length);

                            // Send audio via WhatsApp using base64
                            await this.whatsappService.sendAudio(instanceName, phone, audioBase64);

                            // Save audio message to database
                            const audioMsg = await this.prisma.message.create({
                                data: {
                                    conversationId: conversation.id,
                                    content: trimmedPart,
                                    fromMe: true,
                                    type: 'TEXT',
                                    messageId: crypto.randomUUID(),
                                    thought: fsmDecision.reasoning.join('\n'),
                                },
                            });

                            // Emit AI audio message event
                            this.eventEmitter.emit('conversation.message', {
                                conversationId: conversation.id,
                                message: {
                                    id: audioMsg.id, // We need to capture the created message
                                    content: trimmedPart,
                                    time: audioMsg.timestamp,
                                    sent: true,
                                    read: true,
                                    role: 'assistant',
                                    type: 'TEXT', // Stored as text even if audio? 
                                    // Actually DB stores type TEXT for AI? 
                                    // User code says type: 'TEXT'.
                                    // But frontend might want to know if it's audio?
                                    // The code sends audio via WA but saves as TEXT in DB?
                                    // Yes: type: 'TEXT', messageId: ...
                                }
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
                        const textMsg = await this.prisma.message.create({
                            data: {
                                conversationId: conversation.id,
                                content: trimmedPart,
                                fromMe: true,
                                type: 'TEXT',
                                messageId: crypto.randomUUID(),
                                thought: fsmDecision.reasoning.join('\n'),
                            },
                        });

                        // Emit AI text message event
                        this.eventEmitter.emit('conversation.message', {
                            conversationId: conversation.id,
                            message: {
                                id: textMsg.id,
                                content: trimmedPart,
                                time: textMsg.timestamp,
                                sent: true,
                                read: true,
                                role: 'assistant',
                                type: 'TEXT'
                            }
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

    /**
     * Fetches available scheduling slots for the lead if auto-scheduling is configured
     * Returns formatted string with morning and afternoon slots, or empty string if not applicable
     */
    private async getSchedulingContext(organizationId: string, leadId: string, agentId: string, crmStageId?: string | null): Promise<string> {
        try {
            if (!crmStageId) return '';

            // Check if this CRM stage has auto-scheduling configured
            const config = await this.prisma.autoSchedulingConfig.findFirst({
                where: {
                    agentId: agentId,
                    crmStageId: crmStageId,
                    isActive: true,
                }
            });

            if (!config) return '';

            console.log('[WhatsApp] 📅 Auto-scheduling config found, fetching available slots...');

            // Calculate minimum date based on advance hours
            const now = new Date();
            const minAdvanceMs = config.minAdvanceHours * 60 * 60 * 1000;
            const minDate = new Date(now.getTime() + minAdvanceMs);

            // Fetch slots for the next 7 days
            const morningSlots: string[] = [];
            const afternoonSlots: string[] = [];

            // Fetch slots for the next 7 days - show ALL available slots
            for (let i = 0; i < 7; i++) {
                const checkDate = new Date(minDate);
                checkDate.setDate(checkDate.getDate() + i);

                const slotDuration = config?.duration || 30;
                const slots = await this.schedulingService.getAvailableSlots(organizationId, checkDate, agentId, slotDuration);

                for (const slot of slots) {
                    if (!slot.available) continue;

                    // IMPORTANT: Skip slots that don't respect minimum advance time
                    if (slot.time < minDate) {
                        continue;
                    }

                    // Convert UTC time to Brazil time for display (UTC-3)
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
                console.log('[WhatsApp] 📅 No available slots found');
                return '';
            }

            const context = `
HORÁRIOS DISPONÍVEIS PARA AGENDAMENTO (tempo real):
${morningSlots.length > 0 ? `- MANHÃ: ${morningSlots.join(', ')}` : '- MANHÃ: Sem horários disponíveis'}
${afternoonSlots.length > 0 ? `- TARDE: ${afternoonSlots.join(', ')}` : '- TARDE: Sem horários disponíveis'}

IMPORTANTE: Ao apresentar horários ao lead, NÃO coloque cada horário em uma linha separada. Liste-os de forma compacta em uma única mensagem (ex: "Temos disponível quinta às 08:00, 09:00, 10:00 ou segunda às 08:00, 09:00").
Ao perguntar se o lead prefere "manhã ou tarde?", considere que estes são os horários reais disponíveis.`;

            console.log('[WhatsApp] 📅 Scheduling context prepared:', { morningSlots, afternoonSlots });
            return context;

        } catch (error) {
            console.error('[WhatsApp] Error fetching scheduling context:', error);
            return '';
        }
    }

    private buildSystemPrompt(agent: any, state: any, fsmDecision: any, schedulingContext?: string): string {
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
3. Não encerre a mensagem apenas com a resposta da dúvida. Sempre termine sua mensagem direcionando o usuário para cumprir a MISSÃO NESTE ESTADO (${state?.missionPrompt}).

Exemplo: "O preço é R$100 (Resposta da dúvida). Agora, sobre seu interesse, qual plano prefere? (Retomada da Missão)"

Responda de forma natural e ajude o usuário conforme a missão do estado atual.`;
    }
}