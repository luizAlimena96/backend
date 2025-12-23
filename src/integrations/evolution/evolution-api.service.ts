import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as QRCode from 'qrcode';

@Injectable()
export class EvolutionAPIService {
    constructor(private httpService: HttpService) { }

    private getBaseUrl(): string {
        return process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    }

    private getApiKey(): string {
        return process.env.EVOLUTION_API_KEY || '';
    }

    async createInstance(instanceName: string): Promise<{ existed: boolean }> {
        try {
            console.log(`[Evolution API] Creating instance: ${instanceName}`);
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/instance/create`,
                    {
                        instanceName,
                        qrcode: true,
                        integration: 'WHATSAPP-BAILEYS'
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

            console.log('[Evolution API] Instance created successfully');
            return { existed: false };
        } catch (error: any) {
            const status = error.response?.status;
            const errorData = error.response?.data;
            const errorMessage = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);

            // Check if instance already exists
            const isConflict = status === 409;
            const isForbidden = status === 403;
            const isAlreadyInUse = errorMessage?.includes('already exists') ||
                errorMessage?.includes('already in use') ||
                errorMessage?.includes('This name');

            if (isConflict || (isForbidden && isAlreadyInUse)) {
                console.log(`[Evolution API] Instance ${instanceName} already exists, continuing...`);
                return { existed: true };
            }

            console.error('[Evolution API] Create instance error:', errorMessage || error.message);
            throw error;
        }
    }

    async getQRCode(instanceName: string): Promise<string> {
        try {
            // First ensure instance exists
            const { existed } = await this.createInstance(instanceName);

            console.log(`[Evolution API] Fetching QR Code for ${instanceName}`);
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

            const data = response.data;
            // Check all possible locations for QR code
            const qrCode = data.qrcode?.base64 || data.qrcode || data.qr || data.code || data.base64 || '';

            if (!qrCode) {
                // If instance is already connected, it might not return QR
                if (data.instance?.state === 'open' || data.state === 'open') {
                    console.log('[Evolution API] Instance already connected');
                    return 'CONNECTED';
                }
                console.warn('[Evolution API] No QR code found in response:', data);
                throw new Error('QR Code not found in API response');
            }

            // Ensure it's a proper data URI
            if (!qrCode.startsWith('http') && !qrCode.startsWith('data:')) {
                // If it's a pairing code or raw string, convert to image
                if (qrCode.startsWith('2@') || !qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
                    try {
                        console.log('[Evolution API] Converting raw code to QR image...');
                        return await QRCode.toDataURL(qrCode);
                    } catch (err) {
                        console.error('[Evolution API] Error converting QR code:', err);
                        throw new Error('Failed to generate QR code image');
                    }
                }
                return `data:image/png;base64,${qrCode}`;
            }

            return qrCode;

        } catch (error: any) {
            // Handle specific case where name is taken by another account
            if (error.response?.status === 401) {
                console.error('[Evolution API] Unauthorized / Name in use');
                throw new Error('This name is already in use by another account (Unauthorized)');
            }

            console.error('[Evolution API] Get QR code error:', error.message);
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
            const body: any = {
                number: to,
                caption,
            };

            // Check if it's a Data URI
            if (mediaUrl.startsWith('data:')) {
                const matches = mediaUrl.match(/^data:(.+?);base64,(.+)$/);
                if (matches) {
                    body.mimetype = matches[1];
                    body.media = matches[2]; // Raw base64
                } else {
                    body.media = mediaUrl;
                }
            } else {
                body.media = mediaUrl; // Use media for everything consistency, or keep mediaUrl?
                // To be safe and consistent with other methods, we use 'media' fallback if we change logic,
                // but strictly speaking, if 'mediaUrl' was working for URLs, we could keep it.
                // However, Evolution v2 prefers 'media'. Let's keep 'mediaUrl' for URLs to minimize regression risk if relying on legacy param.
                // Actually, let's use the code's existing pattern:
                body.mediaUrl = mediaUrl;
            }

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    body,
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
            const body: any = {
                number: to,
                mediatype: 'image',
                caption,
            };

            // Check if it's a Data URI
            if (imageUrl.startsWith('data:')) {
                const matches = imageUrl.match(/^data:(.+?);base64,(.+)$/);
                if (matches) {
                    body.mimetype = matches[1];
                    body.media = matches[2]; // Raw base64
                } else {
                    body.media = imageUrl;
                }
            } else {
                body.media = imageUrl;
            }

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    body,
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
            // Videos: always send URL directly in 'media' field
            const body = {
                number: to,
                mediatype: 'video',
                caption,
                media: videoUrl, // Direct URL (e.g., https://drive.google.com/uc?export=download&id=...)
            };

            console.log('[Evolution API] 🎬 Sending video:', {
                number: body.number,
                mediatype: body.mediatype,
                caption: body.caption,
                media: body.media
            });

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    body,
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 60000,
                    }
                )
            );

            console.log('[Evolution API] ✅ Video sent successfully');
            return response.data;
        } catch (error) {
            console.error('Evolution API send video error:', error);
            throw error;
        }
    }

    async sendDocument(instanceName: string, to: string, documentUrl: string, fileName?: string, caption?: string): Promise<any> {
        try {
            const body: any = {
                number: to,
                mediatype: 'document',
                fileName: fileName || 'document',
                caption,
            };

            // Check if it's a Data URI
            if (documentUrl.startsWith('data:')) {
                const matches = documentUrl.match(/^data:(.+?);base64,(.+)$/);
                if (matches) {
                    body.mimetype = matches[1];
                    body.media = matches[2]; // Raw base64
                } else {
                    body.media = documentUrl;
                }
            } else {
                body.media = documentUrl;
            }

            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    body,
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

    async logoutInstance(instanceName: string): Promise<any> {
        try {
            console.log(`[Evolution API] Logging out instance: ${instanceName}`);
            const response = await firstValueFrom(
                this.httpService.delete(
                    `${this.getBaseUrl()}/instance/logout/${instanceName}`,
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
            console.error('Evolution API logout error:', error);
            // Ignore error if instance is already logged out or not found
            return null;
        }
    }
}
