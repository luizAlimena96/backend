import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { MetaLeadsService } from '../../integrations/meta/meta-leads.service';
import { EvolutionAPIService } from '../../integrations/evolution/evolution-api.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MetaLeadsProcessorService {
    constructor(
        private prisma: PrismaService,
        private metaLeadsService: MetaLeadsService,
        private evolutionApiService: EvolutionAPIService,
        private httpService: HttpService,
    ) { }

    /**
     * Process a lead from Meta Lead Ads
     */
    async processLead(
        leadgenId: string,
        pageId: string,
        formId?: string,
        adId?: string,
    ): Promise<void> {
        console.log(`[Meta Processor] Processing lead ${leadgenId}`);

        try {
            const organization = await this.prisma.organization.findFirst({
                where: {
                    OR: [
                        { metaPageId: pageId },
                        { metaIntegrationEnabled: true },
                    ],
                } as any,
            }) as any;

            if (!organization) {
                console.error('[Meta Processor] No organization found for this page');
                return;
            }

            if (!organization.metaAccessToken) {
                console.error('[Meta Processor] No Meta access token configured');
                return;
            }

            // 1. Fetch lead data from Graph API
            const leadData = await this.metaLeadsService.getLeadDetails(
                leadgenId,
                organization.metaAccessToken,
                organization.metaGraphApiVersion || 'v24.0',
            );

            if (!leadData) {
                console.error('[Meta Processor] Failed to fetch lead data');
                return;
            }

            // 2. Parse lead data
            const parsedLead = this.metaLeadsService.parseLeadData(leadData);
            console.log('[Meta Processor] Parsed lead:', parsedLead);

            if (!parsedLead.phone) {
                console.error('[Meta Processor] Lead has no phone number');
                return;
            }

            // 3. Format phone number
            const formattedPhone = this.metaLeadsService.formatPhoneNumber(parsedLead.phone);
            if (!formattedPhone) {
                console.error('[Meta Processor] Invalid phone number format');
                return;
            }

            console.log('[Meta Processor] Formatted phone:', formattedPhone);

            // 4. Check if lead already exists
            const existingLead = await this.prisma.lead.findFirst({
                where: {
                    OR: [
                        { phone: formattedPhone.phone9 },
                        { phone: formattedPhone.phone8 },
                        { phoneWith9: formattedPhone.phone9 },
                        { phoneNo9: formattedPhone.phone8 },
                        { metaLeadgenId: leadgenId },
                    ],
                    organizationId: organization.id,
                } as any,
            });

            if (existingLead) {
                console.log(`[Meta Processor] Lead already exists: ${existingLead.id}`);
                return;
            }

            // 5. Check WhatsApp number via Evolution API
            let isWhatsApp = false;
            if (organization.evolutionInstanceName && organization.evolutionApiUrl) {
                try {
                    isWhatsApp = await this.checkWhatsAppNumber(
                        organization.evolutionApiUrl,
                        organization.evolutionApiKey || '',
                        organization.evolutionInstanceName,
                        formattedPhone.phone9,
                    );
                    console.log(`[Meta Processor] WhatsApp check: ${isWhatsApp}`);
                } catch (err) {
                    console.error('[Meta Processor] WhatsApp check failed:', err);
                }
            }

            // 6. Get first agent of organization
            const agent = await this.prisma.agent.findFirst({
                where: { organizationId: organization.id, isActive: true },
            });

            if (!agent) {
                console.error('[Meta Processor] No active agent found');
                return;
            }

            // 7. Create lead in local database
            const lead = await this.prisma.lead.create({
                data: {
                    name: parsedLead.name,
                    email: parsedLead.email,
                    phone: formattedPhone.phone9,
                    phoneWith9: formattedPhone.phone9,
                    phoneNo9: formattedPhone.phone8,
                    source: 'meta_leads',
                    metaLeadgenId: leadgenId,
                    organizationId: organization.id,
                    agentId: agent.id,
                    extractedData: JSON.parse(JSON.stringify({
                        metaFormId: formId,
                        metaAdId: adId,
                        metaRawData: parsedLead.rawData,
                    })),
                } as any,
            });

            console.log(`[Meta Processor] Created lead: ${lead.id}`);

            // 8. Create conversation
            const conversation = await this.prisma.conversation.create({
                data: {
                    whatsapp: formattedPhone.phone9,
                    organizationId: organization.id,
                    agentId: agent.id,
                    leadId: lead.id,
                    aiEnabled: true,
                },
            });

            console.log(`[Meta Processor] Created conversation: ${conversation.id}`);

            // 9. Send welcome message via WhatsApp
            if (isWhatsApp && organization.evolutionInstanceName) {
                const welcomeMessage = (organization.metaWelcomeMessage || 'Olá, falo com {{nome}}?')
                    .replace(/\{\{nome\}\}/g, parsedLead.name || 'você');

                try {
                    await this.evolutionApiService.sendMessage(
                        organization.evolutionInstanceName,
                        formattedPhone.phone9,
                        welcomeMessage,
                    );

                    // 10. Save message to database
                    await this.prisma.message.create({
                        data: {
                            messageId: `meta_welcome_${Date.now()}`,
                            conversationId: conversation.id,
                            content: welcomeMessage,
                            fromMe: true,
                            type: 'TEXT',
                            timestamp: new Date(),
                        },
                    });

                    console.log('[Meta Processor] Welcome message sent and saved');
                } catch (err) {
                    console.error('[Meta Processor] Failed to send welcome message:', err);
                }
            }

            console.log(`[Meta Processor] ✅ Lead ${leadgenId} processed successfully`);
        } catch (error) {
            console.error('[Meta Processor] Error processing lead:', error);
        }
    }

    /**
     * Check if phone number is on WhatsApp
     */
    private async checkWhatsAppNumber(
        apiUrl: string,
        apiKey: string,
        instanceName: string,
        phone: string,
    ): Promise<boolean> {
        try {
            const url = `${apiUrl}/chat/whatsappNumbers/${instanceName}`;

            const response = await firstValueFrom(
                this.httpService.post(
                    url,
                    { numbers: [phone] },
                    {
                        headers: {
                            apikey: apiKey,
                            'Content-Type': 'application/json',
                        },
                        timeout: 30000,
                    },
                ),
            );

            const results = response.data || [];
            return results.some((r: any) => r.exists === true);
        } catch (error) {
            console.error('[Meta Processor] WhatsApp check error:', error);
            return false;
        }
    }
}
