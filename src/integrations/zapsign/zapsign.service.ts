import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ZapSignService {
    constructor(private httpService: HttpService) { }

    async createDocument(apiToken: string, templateId: string, data: any): Promise<any> {
        try {
            console.log(`[ZapSign] Creating document from template: ${templateId}`);
            console.log(`[ZapSign] Request data:`, JSON.stringify(data, null, 2));

            const response = await firstValueFrom(
                this.httpService.post(
                    'https://api.zapsign.com.br/api/v1/models/create-doc/',
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

            console.log(`[ZapSign] Document created successfully:`, response.data);
            return response.data;
        } catch (error: any) {
            console.error('[ZapSign] Create document error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url,
                templateId: templateId
            });
            throw new Error(`Failed to create ZapSign document: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
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

    async getTemplates(apiToken: string): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(
                    'https://api.zapsign.com.br/api/v1/templates/?limit=5',
                    {
                        headers: {
                            Authorization: `Bearer ${apiToken}`,
                        },
                    }
                )
            );
            return response.data;
        } catch (error) {
            console.error('ZapSign get templates error:', error);
            throw new Error('Failed to get templates');
        }
    }
}
