import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ZapSignService {
    constructor(private httpService: HttpService) { }

    async createDocument(apiToken: string, templateId: string, data: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.zapsign.com.br/api/v1/documents/',
                    {
                        template_id: templateId,
                        ...data,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${apiToken}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('ZapSign create document error:', error);
            throw new Error('Failed to create ZapSign document');
        }
    }

    async getDocumentStatus(apiToken: string, documentId: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    `https://api.zapsign.com.br/api/v1/documents/${documentId}/`,
                    {
                        headers: {
                            Authorization: `Bearer ${apiToken}`,
                        },
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('ZapSign get document status error:', error);
            throw new Error('Failed to get document status');
        }
    }
}
