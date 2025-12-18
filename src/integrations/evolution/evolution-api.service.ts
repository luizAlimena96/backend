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
                        signal: AbortSignal.timeout(30000),
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
                        signal: AbortSignal.timeout(30000),
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
                        timeout: 30000,
                        signal: AbortSignal.timeout(30000),
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
                        signal: AbortSignal.timeout(30000),
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
                        signal: AbortSignal.timeout(30000),
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
                        signal: AbortSignal.timeout(30000),
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
                        signal: AbortSignal.timeout(30000),
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API send document error:', error);
            throw error;
        }
    }

    async sendAudio(instanceName: string, to: string, audioUrl: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${this.getBaseUrl()}/message/sendMedia/${instanceName}`,
                    {
                        number: to,
                        mediatype: 'audio',
                        media: audioUrl,
                    },
                    {
                        headers: {
                            apikey: this.getApiKey(),
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                        signal: AbortSignal.timeout(30000),
                    }
                )
            );

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
                        signal: AbortSignal.timeout(30000),
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API status error:', error);
            throw error;
        }
    }
}
