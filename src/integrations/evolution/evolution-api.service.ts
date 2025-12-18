import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class EvolutionAPIService {
    constructor(private httpService: HttpService) { }

    private getBaseUrl(): string {
        return process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    }

    private getApiKey(): string {
        return process.env.EVOLUTION_API_KEY || '';
    }

    async createInstance(instanceName: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/instance/create`,
                    { instanceName },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API create instance error:', error);
            throw error;
        }
    }

    async getQRCode(instanceName: string): Promise<string> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.getBaseUrl()}/instance/connect/${instanceName}`,
                    {
                        headers: {
                            apikey: this.getApiKey(),
                        },
                        timeout: 30000,
                    }
                )
            );

            return response.data.qrcode?.base64 || '';
        } catch (error) {
            console.error('Evolution API QR code error:', error);
            throw error;
        }
    }

    async sendMessage(instanceName: string, to: string, message: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendText/${instanceName}`,
                    {
                        number: to,
                        text: message,
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 60000,
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API send message error:', error);
            throw error;
        }
    }

    async sendMedia(instanceName: string, to: string, mediaUrl: string, caption?: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    {
                        number: to,
                        mediaUrl,
                        caption,
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API send media error:', error);
            throw error;
        }
    }

    async sendImage(instanceName: string, to: string, imageUrl: string, caption?: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    {
                        number: to,
                        mediatype: 'image',
                        media: imageUrl,
                        caption,
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API send image error:', error);
            throw error;
        }
    }

    async sendVideo(instanceName: string, to: string, videoUrl: string, caption?: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    {
                        number: to,
                        mediatype: 'video',
                        media: videoUrl,
                        caption,
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API send video error:', error);
            throw error;
        }
    }

    async sendDocument(instanceName: string, to: string, documentUrl: string, fileName?: string, caption?: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    {
                        number: to,
                        mediatype: 'document',
                        media: documentUrl,
                        fileName: fileName || 'document',
                        caption,
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API send document error:', error);
            throw error;
        }
    }
    /**
     * Send audio message using base64 encoded data
     * Uses sendWhatsAppAudio endpoint which supports base64 audio
     */
    async sendAudio(instanceName: string, to: string, audioBase64: string): Promise<any> {
        try {
            console.log('[Evolution API] Sending audio via sendWhatsAppAudio endpoint...');
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendWhatsAppAudio/${instanceName}`,
                    {
                        number: to,
                        audio: audioBase64,
                        encoding: true, // Indicates base64 encoded
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 60000, // Audio may take longer
                    }
                )
            );

            console.log('[Evolution API] Audio sent successfully');
            return response.data;
        } catch (error) {
            console.error('Evolution API send audio error:', error);
            throw error;
        }
    }

    async getInstanceStatus(instanceName: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `${this.getBaseUrl()}/instance/connectionState/${instanceName}`,
                    {
                        headers: {
                            apikey: this.getApiKey(),
                        },
                        timeout: 30000,
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API status error:', error);
            throw error;
        }
    }

    /**
     * Get Base64 encoded media from a WhatsApp message
     * This is needed because WhatsApp media URLs are encrypted and cannot be downloaded directly
     */
    async getBase64FromMediaMessage(instanceName: string, messageKeyId: string): Promise<{ base64: string; mimetype: string } | null> {
        try {
            console.log('[Evolution API] Getting base64 from media message, keyId:', messageKeyId);
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/chat/getBase64FromMediaMessage/${instanceName}`,
                    {
                        "message": {
                            "key": {
                                "id": messageKeyId
                            }
                        },
                        "convertToMp4": false,
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 60000,
                    }
                )
            );

            console.log('[Evolution API] Got base64 response:', {
                hasBase64: !!response.data?.base64,
                base64Length: response.data?.base64?.length || 0,
                mimetype: response.data?.mimetype,
            });

            return response.data;
        } catch (error) {
            console.error('Evolution API getBase64FromMediaMessage error:', error);
            return null;
        }
    }
}
