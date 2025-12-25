import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WhatsAppCloudService } from '../whatsapp-cloud/whatsapp-cloud.service';
import { InstagramIntegrationService } from '../instagram/instagram-integration.service';
import { EvolutionAPIService } from '../evolution/evolution-api.service';

export interface SendMessageOptions {
    organizationId: string;
    to: string;
    message: string;
    channel?: 'whatsapp' | 'instagram';
    mediaType?: 'text' | 'image' | 'video' | 'audio' | 'document';
    mediaUrl?: string;
    caption?: string;
    filename?: string;
    templateName?: string;
    templateParams?: string[];
}

export interface SendResult {
    success: boolean;
    messageId?: string;
    channel: 'evolution' | 'cloud_api' | 'instagram';
    error?: string;
}

@Injectable()
export class MessageRouterService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly whatsappCloudService: WhatsAppCloudService,
        private readonly instagramService: InstagramIntegrationService,
        private readonly evolutionService: EvolutionAPIService,
    ) { }

    /**
     * Route message to the appropriate channel based on organization config
     */
    async sendMessage(options: SendMessageOptions): Promise<SendResult> {
        const { organizationId, to, message, channel, mediaType = 'text', mediaUrl, caption, filename, templateName, templateParams } = options;

        // Get organization config
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                preferredChannel: true,
                evolutionApiUrl: true,
                evolutionInstanceName: true,
                whatsappPhoneNumberId: true,
                whatsappCloudAccessToken: true,
                instagramAccountId: true,
                metaAccessToken: true,
            },
        });

        if (!organization) {
            return { success: false, channel: 'evolution', error: 'Organization not found' };
        }

        // Instagram DM
        if (channel === 'instagram') {
            return this.sendViaInstagram(organization, to, message, mediaType, mediaUrl);
        }

        // WhatsApp - determine which API to use
        const preferredChannel = organization.preferredChannel || 'evolution';

        if (preferredChannel === 'cloud_api' && organization.whatsappPhoneNumberId && organization.whatsappCloudAccessToken) {
            // Check if we need to use a template (24h window check would be done separately)
            if (templateName) {
                return this.sendTemplateViaCloudApi(organization, to, templateName, templateParams);
            }
            return this.sendViaCloudApi(organization, to, message, mediaType, mediaUrl, caption, filename);
        } else {
            // Evolution API
            return this.sendViaEvolution(organization, to, message, mediaType, mediaUrl, caption, filename);
        }
    }

    /**
     * Send via WhatsApp Cloud API
     */
    private async sendViaCloudApi(
        organization: any,
        to: string,
        message: string,
        mediaType: string,
        mediaUrl?: string,
        caption?: string,
        filename?: string,
    ): Promise<SendResult> {
        try {
            const { whatsappPhoneNumberId, whatsappCloudAccessToken } = organization;

            let result;
            switch (mediaType) {
                case 'image':
                    result = await this.whatsappCloudService.sendImage(
                        whatsappPhoneNumberId,
                        to,
                        whatsappCloudAccessToken,
                        mediaUrl!,
                        caption,
                    );
                    break;
                case 'video':
                    result = await this.whatsappCloudService.sendVideo(
                        whatsappPhoneNumberId,
                        to,
                        whatsappCloudAccessToken,
                        mediaUrl!,
                        caption,
                    );
                    break;
                case 'audio':
                    result = await this.whatsappCloudService.sendAudio(
                        whatsappPhoneNumberId,
                        to,
                        whatsappCloudAccessToken,
                        mediaUrl!,
                    );
                    break;
                case 'document':
                    result = await this.whatsappCloudService.sendDocument(
                        whatsappPhoneNumberId,
                        to,
                        whatsappCloudAccessToken,
                        mediaUrl!,
                        filename || 'document',
                        caption,
                    );
                    break;
                default:
                    result = await this.whatsappCloudService.sendTextMessage(
                        whatsappPhoneNumberId,
                        to,
                        whatsappCloudAccessToken,
                        message,
                    );
            }

            return {
                success: true,
                messageId: result?.messages?.[0]?.id,
                channel: 'cloud_api',
            };
        } catch (error: any) {
            console.error('[MessageRouter] Cloud API error:', error.message);
            return {
                success: false,
                channel: 'cloud_api',
                error: error.message,
            };
        }
    }

    /**
     * Send template via WhatsApp Cloud API
     */
    private async sendTemplateViaCloudApi(
        organization: any,
        to: string,
        templateName: string,
        templateParams?: string[],
    ): Promise<SendResult> {
        try {
            const { whatsappPhoneNumberId, whatsappCloudAccessToken } = organization;

            const components = templateParams?.length
                ? [{ type: 'body' as const, parameters: templateParams.map(p => ({ type: 'text' as const, text: p })) }]
                : undefined;

            const result = await this.whatsappCloudService.sendTemplate(
                whatsappPhoneNumberId,
                to,
                whatsappCloudAccessToken,
                templateName,
                'pt_BR',
                components,
            );

            return {
                success: true,
                messageId: result?.messages?.[0]?.id,
                channel: 'cloud_api',
            };
        } catch (error: any) {
            console.error('[MessageRouter] Template send error:', error.message);
            return {
                success: false,
                channel: 'cloud_api',
                error: error.message,
            };
        }
    }

    /**
     * Send via Evolution API
     */
    private async sendViaEvolution(
        organization: any,
        to: string,
        message: string,
        mediaType: string,
        mediaUrl?: string,
        caption?: string,
        filename?: string,
    ): Promise<SendResult> {
        try {
            const { evolutionApiUrl, evolutionInstanceName } = organization;

            if (!evolutionApiUrl || !evolutionInstanceName) {
                return { success: false, channel: 'evolution', error: 'Evolution API not configured' };
            }

            let result;
            switch (mediaType) {
                case 'image':
                    result = await this.evolutionService.sendImage(
                        evolutionInstanceName,
                        to,
                        mediaUrl!,
                        caption,
                    );
                    break;
                case 'video':
                    result = await this.evolutionService.sendVideo(
                        evolutionInstanceName,
                        to,
                        mediaUrl!,
                        caption,
                    );
                    break;
                case 'audio':
                    result = await this.evolutionService.sendAudio(
                        evolutionInstanceName,
                        to,
                        mediaUrl!,
                    );
                    break;
                case 'document':
                    result = await this.evolutionService.sendDocument(
                        evolutionInstanceName,
                        to,
                        mediaUrl!,
                        filename || 'document',
                    );
                    break;
                default:
                    result = await this.evolutionService.sendMessage(
                        evolutionInstanceName,
                        to,
                        message,
                    );
            }

            return {
                success: true,
                messageId: result?.key?.id,
                channel: 'evolution',
            };
        } catch (error: any) {
            console.error('[MessageRouter] Evolution API error:', error.message);
            return {
                success: false,
                channel: 'evolution',
                error: error.message,
            };
        }
    }

    /**
     * Send via Instagram
     */
    private async sendViaInstagram(
        organization: any,
        to: string,
        message: string,
        mediaType: string,
        mediaUrl?: string,
    ): Promise<SendResult> {
        try {
            const { instagramAccountId, metaAccessToken } = organization;

            if (!instagramAccountId || !metaAccessToken) {
                return { success: false, channel: 'instagram', error: 'Instagram not configured' };
            }

            let result;
            switch (mediaType) {
                case 'image':
                    result = await this.instagramService.sendImage(
                        instagramAccountId,
                        to,
                        metaAccessToken,
                        mediaUrl!,
                    );
                    break;
                case 'video':
                    result = await this.instagramService.sendVideo(
                        instagramAccountId,
                        to,
                        metaAccessToken,
                        mediaUrl!,
                    );
                    break;
                case 'audio':
                    result = await this.instagramService.sendAudio(
                        instagramAccountId,
                        to,
                        metaAccessToken,
                        mediaUrl!,
                    );
                    break;
                default:
                    result = await this.instagramService.sendTextMessage(
                        instagramAccountId,
                        to,
                        metaAccessToken,
                        message,
                    );
            }

            return {
                success: true,
                messageId: result?.message_id,
                channel: 'instagram',
            };
        } catch (error: any) {
            console.error('[MessageRouter] Instagram error:', error.message);
            return {
                success: false,
                channel: 'instagram',
                error: error.message,
            };
        }
    }
}
