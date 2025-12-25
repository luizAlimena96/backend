import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface InstagramMessage {
    recipient: { id: string };
    message: {
        text?: string;
        attachment?: {
            type: 'image' | 'video' | 'audio' | 'file';
            payload: { url: string };
        };
    };
}

export interface InstagramWebhookPayload {
    object: 'instagram';
    entry: Array<{
        id: string;
        time: number;
        messaging: Array<{
            sender: { id: string };
            recipient: { id: string };
            timestamp: number;
            message?: {
                mid: string;
                text?: string;
                attachments?: Array<{
                    type: 'image' | 'video' | 'audio' | 'file';
                    payload: { url: string };
                }>;
            };
            postback?: {
                mid: string;
                title: string;
                payload: string;
            };
        }>;
    }>;
}

@Injectable()
export class InstagramIntegrationService {
    private readonly graphApiUrl = 'https://graph.facebook.com/v24.0';

    constructor(private readonly httpService: HttpService) { }

    /**
     * Verify webhook challenge
     */
    verifyWebhook(mode: string, token: string, challenge: string, expectedToken: string): string | null {
        if (mode === 'subscribe' && token === expectedToken) {
            console.log('[Instagram] Webhook verified successfully');
            return challenge;
        }
        console.error('[Instagram] Webhook verification failed');
        return null;
    }

    /**
     * Send a text message
     */
    async sendTextMessage(
        instagramAccountId: string,
        recipientId: string,
        accessToken: string,
        text: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${instagramAccountId}/messages`;
        const payload: InstagramMessage = {
            recipient: { id: recipientId },
            message: { text },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send an image
     */
    async sendImage(
        instagramAccountId: string,
        recipientId: string,
        accessToken: string,
        imageUrl: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${instagramAccountId}/messages`;
        const payload: InstagramMessage = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: 'image',
                    payload: { url: imageUrl },
                },
            },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send a video
     */
    async sendVideo(
        instagramAccountId: string,
        recipientId: string,
        accessToken: string,
        videoUrl: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${instagramAccountId}/messages`;
        const payload: InstagramMessage = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: 'video',
                    payload: { url: videoUrl },
                },
            },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send an audio
     */
    async sendAudio(
        instagramAccountId: string,
        recipientId: string,
        accessToken: string,
        audioUrl: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${instagramAccountId}/messages`;
        const payload: InstagramMessage = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: 'audio',
                    payload: { url: audioUrl },
                },
            },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send a file/document
     */
    async sendFile(
        instagramAccountId: string,
        recipientId: string,
        accessToken: string,
        fileUrl: string,
    ): Promise<any> {
        const url = `${this.graphApiUrl}/${instagramAccountId}/messages`;
        const payload: InstagramMessage = {
            recipient: { id: recipientId },
            message: {
                attachment: {
                    type: 'file',
                    payload: { url: fileUrl },
                },
            },
        };

        return this.sendRequest(url, payload, accessToken);
    }

    /**
     * Send image with caption (caption as separate message)
     */
    async sendImageWithCaption(
        instagramAccountId: string,
        recipientId: string,
        accessToken: string,
        imageUrl: string,
        caption: string,
    ): Promise<any> {
        // First send the image
        await this.sendImage(instagramAccountId, recipientId, accessToken, imageUrl);
        // Then send the caption as text
        return this.sendTextMessage(instagramAccountId, recipientId, accessToken, caption);
    }

    /**
     * Get user profile
     */
    async getUserProfile(userId: string, accessToken: string): Promise<{ name?: string; username?: string } | null> {
        try {
            const url = `${this.graphApiUrl}/${userId}`;
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    params: {
                        fields: 'name,username',
                        access_token: accessToken,
                    },
                    timeout: 30000,
                }),
            );
            return response.data;
        } catch (error: any) {
            console.error('[Instagram] Error getting user profile:', error.message);
            return null;
        }
    }

    /**
     * Parse incoming webhook payload
     */
    parseWebhookPayload(payload: InstagramWebhookPayload): {
        accountId: string;
        senderId: string;
        messageId: string;
        timestamp: number;
        text?: string;
        attachments?: Array<{ type: string; url: string }>;
        isPostback: boolean;
        postbackPayload?: string;
    } | null {
        try {
            const entry = payload.entry?.[0];
            const messaging = entry?.messaging?.[0];

            if (!messaging) return null;

            const isPostback = !!messaging.postback;

            return {
                accountId: entry.id,
                senderId: messaging.sender.id,
                messageId: messaging.message?.mid || messaging.postback?.mid || '',
                timestamp: messaging.timestamp,
                text: messaging.message?.text || messaging.postback?.title,
                attachments: messaging.message?.attachments?.map(att => ({
                    type: att.type,
                    url: att.payload.url,
                })),
                isPostback,
                postbackPayload: messaging.postback?.payload,
            };
        } catch (error) {
            console.error('[Instagram] Error parsing webhook payload:', error);
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
            console.log('[Instagram] Message sent successfully:', response.data);
            return response.data;
        } catch (error: any) {
            console.error('[Instagram] Error sending message:', error.response?.data || error.message);
            throw error;
        }
    }
}
