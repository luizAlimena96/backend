import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppCloudService } from '../../integrations/whatsapp-cloud/whatsapp-cloud.service';
import { v4 as uuidv4 } from 'uuid';

interface ParsedMessage {
    phoneNumberId: string;
    from: string;
    messageId: string;
    timestamp: string;
    type: string;
    text?: string;
    mediaId?: string;
    mimeType?: string;
    caption?: string;
    contactName?: string;
}

@Injectable()
export class WhatsAppCloudMessageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly whatsappCloudService: WhatsAppCloudService,
    ) { }

    /**
     * Process incoming message from WhatsApp Cloud API
     */
    async processIncomingMessage(organization: any, parsed: ParsedMessage): Promise<void> {
        const { from, messageId, text, type, mediaId, mimeType, caption, contactName } = parsed;

        console.log(`[WhatsApp Cloud Message] Processing message from ${from}:`, { type, text, mediaId });

        // Mark message as read
        try {
            await this.whatsappCloudService.markAsRead(
                organization.whatsappPhoneNumberId,
                organization.whatsappCloudAccessToken,
                messageId,
            );
        } catch (error) {
            console.error('[WhatsApp Cloud Message] Error marking as read:', error);
        }

        // Format phone number for internal use
        const formattedPhone = this.formatPhoneForInternal(from);

        // Find or create conversation
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                organizationId: organization.id,
                whatsapp: formattedPhone,
                channel: 'whatsapp',
            },
            include: {
                lead: true,
                agent: true,
            },
        });

        // If no conversation, get default agent and create
        if (!conversation) {
            const defaultAgent = await this.prisma.agent.findFirst({
                where: { organizationId: organization.id },
                orderBy: { createdAt: 'asc' },
            });

            if (!defaultAgent) {
                console.error('[WhatsApp Cloud Message] No agent found for organization:', organization.id);
                return;
            }

            // Create conversation
            conversation = await this.prisma.conversation.create({
                data: {
                    organizationId: organization.id,
                    whatsapp: formattedPhone,
                    channel: 'whatsapp',
                    agentId: defaultAgent.id,
                    aiEnabled: true,
                },
                include: {
                    lead: true,
                    agent: true,
                },
            });

            console.log('[WhatsApp Cloud Message] Created new conversation:', conversation.id);
        }

        // Get message content
        let messageContent = text || caption || '';

        // Handle media messages
        if (mediaId && mimeType) {
            const mediaInfo = await this.handleMediaMessage(
                organization,
                mediaId,
                mimeType,
                type,
            );
            if (mediaInfo && !messageContent) {
                messageContent = mediaInfo.transcription || `[${type} recebido]`;
            }
        }

        if (!messageContent) {
            console.log('[WhatsApp Cloud Message] No message content to process');
            return;
        }

        // Save message to database
        await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                content: messageContent,
                fromMe: false,
                type: 'TEXT',
                messageId: messageId || uuidv4(),
            },
        });

        console.log('[WhatsApp Cloud Message] Message saved to database');

        // Check if AI is enabled
        if (!conversation.aiEnabled) {
            console.log('[WhatsApp Cloud Message] AI disabled for this conversation');
            return;
        }

        // TODO: Integrate with FSM Engine in the future
        // For now, just log that we would process through AI
        console.log('[WhatsApp Cloud Message] Would process through FSM Engine (not yet integrated)');
    }

    /**
     * Handle media message (download, transcribe if audio)
     */
    private async handleMediaMessage(
        organization: any,
        mediaId: string,
        mimeType: string,
        type: string,
    ): Promise<{ transcription?: string } | null> {
        try {
            // Get media URL
            const mediaUrl = await this.whatsappCloudService.getMediaUrl(
                mediaId,
                organization.whatsappCloudAccessToken,
            );

            if (!mediaUrl) {
                console.error('[WhatsApp Cloud Message] Could not get media URL');
                return null;
            }

            // Download media
            const mediaBuffer = await this.whatsappCloudService.downloadMedia(
                mediaUrl,
                organization.whatsappCloudAccessToken,
            );

            if (!mediaBuffer) {
                console.error('[WhatsApp Cloud Message] Could not download media');
                return null;
            }

            // If it's audio, we could transcribe it
            if (type === 'audio') {
                // TODO: Implement audio transcription using OpenAI Whisper
                return { transcription: '[Áudio recebido - transcrição pendente]' };
            }

            return null;
        } catch (error: any) {
            console.error('[WhatsApp Cloud Message] Error handling media:', error.message);
            return null;
        }
    }

    /**
     * Format phone number for internal storage
     */
    private formatPhoneForInternal(phone: string): string {
        // Remove all non-numeric characters
        const cleaned = phone.replace(/\D/g, '');

        // Brazilian format: ensure it has country code
        if (cleaned.length === 11) {
            return `55${cleaned}`;
        }

        return cleaned;
    }
}
