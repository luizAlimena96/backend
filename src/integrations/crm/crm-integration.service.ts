import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CRMIntegrationService {
    constructor(private httpService: HttpService) { }

    async syncLead(leadData: any, crmConfig: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    crmConfig.apiUrl,
                    leadData,
                    {
                        headers: {
                            Authorization: `Bearer ${crmConfig.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('CRM sync error:', error);
            throw error;
        }
    }

    async updateDeal(dealId: string, data: any, crmConfig: any): Promise<any> {
        try {
            const response = await firstValueFrom(
                this.httpService.put(
                    `${crmConfig.apiUrl}/deals/${dealId}`,
                    data,
                    {
                        headers: {
                            Authorization: `Bearer ${crmConfig.apiKey}`,
                            'Content-Type': 'application/json',
                        },
                    }
                )
            );

            return response.data;
        } catch (error) {
            console.error('CRM update error:', error);
            throw error;
        }
    }
}
