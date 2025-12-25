import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface WhatsAppCloudMessage {
    messaging_product: 'whatsapp';
    recipient_type?: 'individual';
    to: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
    text?: { body: string };
    image?: { link: string; caption?: string };
    video?: { link: string; caption?: string };
    audio?: { link: string };
    document?: { link: string; caption?: string; filename?: string };
    template?: {
        name: string;
        language: { code: string };
        components?: Array<{
            type: 'header' | 'body' | 'button';
            parameters: Array<{ type: 'text' | 'image' | 'video' | 'document'; text?: string; image?: { link: string } }>;
        }>;
    };
}

export interface WhatsAppCloudWebhookPayload {
    object: 'whatsapp_business_account';
    entry: Array<{
        id: string;
        changes: Array<{
            field: 'messages';
            value: {
                messaging_product: 'whatsapp';
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: { name: string };
                    wa_id: string;
                }>;
                messages?: Array<{
                    from: string;
                    id: string;
                    timestamp: string;
                    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'button' | 'interactive';
                    text?: { body: string };
                    image?: { id: string; mime_type: string; sha256: string; caption?: string };
                    audio?: { id: string; mime_type: string };
                    video?: { id: string; mime_type: string; caption?: string };
                    document?: { id: string; mime_type: string; filename: string; caption?: string };
                }>;
                statuses?: Array<{
                    id: string;
                    status: 'sent' | 'delivered' | 'read' | 'failed';
                    timestamp: string;
                    recipient_id: string;
                }>;
            };
        }>;
    }>;
}

@Injectable()
export class WhatsAppCloudService {
    private readonly graphApiUrl = 'https://graph.facebook.com/v24.0';

    constructor(private readonly httpService: HttpService) { }

    /**
     * Verify webhook challenge
     */
    verifyWebhook(mode: string, token: string, challenge: string, expectedToken: string): string | null {
        if (mode === 'subscribe' && token === expectedToken) {
            console.log('[WhatsApp Cloud] Webhook verified successfully');
            return challenge;
        }
        console.error('[WhatsApp Cloud] Webhook verification failed');
        return null;
    }

    /**
     * Send a text message
     */
    async sendTextMessage(
        phoneNumberId: string,
        to: string,
        accessToken: string,
        text: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${phoneNumberId}/messages`;
        const payload: WhatsAppCloudMessage = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'text',
            text: { body: text },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send an image
     */
    async sendImage(
        phoneNumberId: string,
        to: string,
        accessToken: string,
        imageUrl: string,
        caption?: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${phoneNumberId}/messages`;
        const payload: WhatsAppCloudMessage = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'image',
            image: { link: imageUrl, caption },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send a video
     */
    async sendVideo(
        phoneNumberId: string,
        to: string,
        accessToken: string,
        videoUrl: string,
        caption?: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${phoneNumberId}/messages`;
        const payload: WhatsAppCloudMessage = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'video',
            video: { link: videoUrl, caption },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send an audio
     */
    async sendAudio(
        phoneNumberId: string,
        to: string,
        accessToken: string,
        audioUrl: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${phoneNumberId}/messages`;
        const payload: WhatsAppCloudMessage = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'audio',
            audio: { link: audioUrl },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send a document
     */
    async sendDocument(
        phoneNumberId: string,
        to: string,
        accessToken: string,
        documentUrl: string,
        filename: string,
        caption?: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${phoneNumberId}/messages`;
        const payload: WhatsAppCloudMessage = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'document',
            document: { link: documentUrl, filename, caption },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send a template message (for messages outside 24h window)
     */
    async sendTemplate(
        phoneNumberId: string,
        to: string,
        accessToken: string,
        templateName: string,
        languageCode: string,
        components?: Array<{ type: 'body'; parameters: Array<{ type: 'text'; text: string }> }>,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${phoneNumberId}/messages`;
        const payload: WhatsAppCloudMessage = {
            messaging_product: 'whatsapp',
            to: this.formatPhoneNumber(to),
            type: 'template',
            template: {
                name: templateName,
                language: { code: languageCode },
                components,
            },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Mark message as read
     */
    async markAsRead(
        phoneNumberId: string,
        accessToken: string,
        messageId: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${phoneNumberId}/messages`;
        const payload = {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Download media from WhatsApp Cloud
     */
    async getMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
        try {
            const url = `${this.graphApiUrl}/${mediaId}`;
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    timeout: 30000,
                }),
            );
            return response.data.url;
        } catch (error: any) {
            console.error('[WhatsApp Cloud] Error getting media URL:', error.message);
            return null;
        }
    }

    /**
     * Download media content
     */
    async downloadMedia(mediaUrl: string, accessToken: string): Promise<Buffer | null> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(mediaUrl, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    responseType: 'arraybuffer',
                    timeout: 60000,
                }),
            );
            return Buffer.from(response.data);
        } catch (error: any) {
            console.error('[WhatsApp Cloud] Error downloading media:', error.message);
            return null;
        }
    }

    /**
     * Upload media to WhatsApp Cloud
     */
    async uploadMedia(
        phoneNumberId: string,
        accessToken: string,
        file: Buffer,
        mimeType: string,
    ): Promise<string | null> {
        try {
            const FormData = require('form-data');
            const formData = new FormData();
            formData.append('file', file, { contentType: mimeType });
            formData.append('messaging_product', 'whatsapp');
            formData.append('type', mimeType);

            const url = `${this.graphApiUrl}/${phoneNumberId}/media`;
            const response = await firstValueFrom(
                this.httpService.post(url, formData, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        ...formData.getHeaders(),
                    },
                    timeout: 60000,
                }),
            );
            return response.data.id;
        } catch (error: any) {
            console.error('[WhatsApp Cloud] Error uploading media:', error.message);
            return null;
        }
    }

    /**
     * Parse incoming webhook payload
     */
    parseWebhookPayload(payload: WhatsAppCloudWebhookPayload): {
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
    } | null {
        try {
            const entry = payload.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const message = value?.messages?.[0];

            if (!message) return null;

            const contact = value?.contacts?.[0];

            return {
                phoneNumberId: value.metadata.phone_number_id,
                from: message.from,
                messageId: message.id,
                timestamp: message.timestamp,
                type: message.type,
                text: message.text?.body,
                mediaId: message.image?.id || message.audio?.id || message.video?.id || message.document?.id,
                mimeType: message.image?.mime_type || message.audio?.mime_type || message.video?.mime_type || message.document?.mime_type,
                caption: message.image?.caption || message.video?.caption || message.document?.caption,
                contactName: contact?.profile?.name,
            };
        } catch (error) {
            console.error('[WhatsApp Cloud] Error parsing webhook payload:', error);
            return null;
        }
    }

    private async sendRequest(url: string, payload: any, accessToken: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                }),
            );
            console.log('[WhatsApp Cloud] Message sent successfully:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[WhatsApp Cloud] Error sending message:', error.response?.data || error.message);
            throw error;
        }
    }

    private formatPhoneNumber(phone: string): string {
        // Remove all non-numeric characters
        return phone.replace(/\D/g, '');
    }
}
