import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface MetaLeadData {
    id: string;
    created_time: string;
    field_data: Array<{
        name: string;
        values: string[];
    }>;
}

export interface ParsedLeadData {
    id: string;
    createdTime: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    rawData: MetaLeadData;
}

@Injectable()
export class MetaLeadsService {
    constructor(private httpService: HttpService) { }

    /**
     * Verify webhook challenge from Meta
     */
    verifyWebhook(
        mode: string,
        token: string,
        challenge: string,
        expectedToken: string,
    ): string | null {
        if (mode === 'subscribe' && token === expectedToken) {
            console.log('[Meta Leads] Webhook verified successfully');
            return challenge;
        }
        console.error('[Meta Leads] Webhook verification failed');
        return null;
    }

    /**
     * Fetch lead details from Facebook Graph API
     */
    async getLeadDetails(
        leadgenId: string,
        accessToken: string,
        apiVersion: string = 'v24.0',
    ): Promise<MetaLeadData | null> {
        try {
            const url = `https://graph.facebook.com/${apiVersion}/${leadgenId}`;

            console.log(`[Meta Leads] Fetching lead ${leadgenId} from Graph API`);

            const response = await firstValueFrom(
                this.httpService.get<MetaLeadData>(url, {
                    params: { access_token: accessToken },
                    timeout: 30000,
                }),
            );

            console.log(`[Meta Leads] Successfully fetched lead ${leadgenId}`);
            return response.data;
        } catch (error: any) {
            console.error('[Meta Leads] Error fetching lead from Graph API:', error.message);
            if (error.response?.data) {
                console.error('[Meta Leads] Graph API error:', JSON.stringify(error.response.data));
            }
            return null;
        }
    }

    /**
     * Parse lead data from Graph API response
     */
    parseLeadData(leadData: MetaLeadData): ParsedLeadData {
        const fieldData = leadData.field_data || [];

        // Common field name mappings
        const nameFields = ['full name', 'name', 'full_name', 'nome'];
        const emailFields = ['email', 'e-mail'];
        const phoneFields = ['phone_number', 'phone', 'telefone', 'whatsapp'];

        let name: string | null = null;
        let email: string | null = null;
        let phone: string | null = null;

        for (const field of fieldData) {
            const fieldName = field.name.toLowerCase();
            const value = field.values?.[0] || null;

            if (!value) continue;

            if (nameFields.includes(fieldName) && !name) {
                name = value;
            } else if (emailFields.includes(fieldName) && !email) {
                email = value;
            } else if (phoneFields.includes(fieldName) && !phone) {
                phone = value;
            }
        }

        return {
            id: leadData.id,
            createdTime: leadData.created_time,
            name,
            email,
            phone,
            rawData: leadData,
        };
    }

    /**
     * Format phone number to Brazilian format
     */
    formatPhoneNumber(rawPhone: string): { phone9: string; phone8: string } | null {
        if (!rawPhone) return null;

        // Remove non-digits
        let digits = rawPhone.replace(/\D/g, '');

        // Add country code if missing
        if (digits.length === 11) {
            digits = '55' + digits;
        } else if (digits.length === 10) {
            digits = '559' + digits; // Add 55 and 9
        }

        if (digits.length < 12 || digits.length > 13) {
            return null;
        }

        const ddi = digits.slice(0, 2);
        const ddd = digits.slice(2, 4);
        let number = digits.slice(4);

        let phone8: string;
        let phone9: string;

        if (number.length === 8) {
            phone8 = number;
            phone9 = '9' + number;
        } else if (number.length === 9) {
            phone9 = number;
            phone8 = number.slice(1);
        } else {
            return null;
        }

        return {
            phone9: `${ddi}${ddd}${phone9}`,
            phone8: `${ddi}${ddd}${phone8}`,
        };
    }
}
