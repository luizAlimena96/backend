import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InstagramIntegrationService } from '../../integrations/instagram/instagram-integration.service';
import { v4 as uuidv4 } from 'uuid';

interface ParsedInstagramMessage {
    accountId: string;
    senderId: string;
    messageId: string;
    timestamp: number;
    text?: string;
    attachments?: Array<{ type: string; url: string }>;
    isPostback: boolean;
    postbackPayload?: string;
}

@Injectable()
export class InstagramMessageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly instagramService: InstagramIntegrationService,
    ) { }

    /**
     * Process incoming message from Instagram
     */
    async processIncomingMessage(organization: any, parsed: ParsedInstagramMessage): Promise<void> {
        const { senderId, messageId, text, attachments, isPostback, postbackPayload } = parsed;

        console.log(`[Instagram Message] Processing message from ${senderId}:`, { text, attachments, isPostback });

        // Find or create conversation
        let conversation = await this.prisma.conversation.findFirst({
            where: {
                organizationId: organization.id,
                whatsapp: senderId, // Using whatsapp field to store Instagram sender ID
                channel: 'instagram',
            },
            include: {
                lead: true,
                agent: true,
            },
        });

        // If no conversation, get default agent and create one
        if (!conversation) {
            const defaultAgent = await this.prisma.agent.findFirst({
                where: { organizationId: organization.id },
                orderBy: { createdAt: 'asc' },
            });

            if (!defaultAgent) {
                console.error('[Instagram Message] No agent found for organization:', organization.id);
                return;
            }

            // Try to get user profile
            let userName: string | undefined;
            try {
                const profile = await this.instagramService.getUserProfile(
                    senderId,
                    organization.metaAccessToken,
                );
                userName = profile?.name || profile?.username;
            } catch (error) {
                console.error('[Instagram Message] Error getting user profile:', error);
            }

            // Create conversation
            conversation = await this.prisma.conversation.create({
                data: {
                    organizationId: organization.id,
                    whatsapp: senderId,
                    channel: 'instagram',
                    agentId: defaultAgent.id,
                    aiEnabled: true,
                },
                include: {
                    lead: true,
                    agent: true,
                },
            });

            console.log('[Instagram Message] Created new conversation:', conversation.id);

            // Send welcome message if configured
            if (organization.instagramWelcomeMessage) {
                try {
                    await this.instagramService.sendTextMessage(
                        organization.instagramAccountId,
                        senderId,
                        organization.metaAccessToken,
                        organization.instagramWelcomeMessage,
                    );
                } catch (error) {
                    console.error('[Instagram Message] Error sending welcome message:', error);
                }
            }
        }

        // Get message content
        let messageContent = text || postbackPayload || '';

        // Handle media attachments
        if (attachments && attachments.length > 0) {
            const attachmentInfo = attachments.map(a => `[${a.type}]`).join(' ');
            if (!messageContent) {
                messageContent = `Mídia recebida: ${attachmentInfo}`;
            }
        }

        if (!messageContent) {
            console.log('[Instagram Message] No message content to process');
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

        console.log('[Instagram Message] Message saved to database');

        // Check if AI is enabled
        if (!conversation.aiEnabled) {
            console.log('[Instagram Message] AI disabled for this conversation');
            return;
        }

        // TODO: Integrate with FSM Engine in the future
        // For now, just log that we would process through AI
        console.log('[Instagram Message] Would process through FSM Engine (not yet integrated)');
    }
}
