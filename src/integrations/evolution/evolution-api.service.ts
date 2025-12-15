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
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('Evolution API send media error:', error);
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
