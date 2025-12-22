import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('webhooks/zapsign')
export class ZapSignWebhookController {
    constructor(private prisma: PrismaService) { }

    @Post()
    async handleZapSignWebhook(@Body() data: any) {
        // console.log('[ZapSign Webhook] Received:', JSON.stringify(data));

        // Handle ZapSign events
        if (data.event_type === 'doc_signed') { // ZapSign sends 'doc_signed' usually, or check docs. Assuming 'doc_signed' or checking payload structure.
            // Docs say: event_type: "doc_signed"
            const docToken = data.token; // Document UUID
            console.log('[ZapSign] Document signed:', docToken);

            try {
                const lead = await this.prisma.lead.findFirst({
                    where: { zapSignDocumentId: docToken }
                });

                if (lead) {
                    await this.prisma.lead.update({
                        where: { id: lead.id },
                        data: {
                            zapSignStatus: 'SIGNED',
                            zapSignSignedAt: new Date()
                        }
                    });
                    console.log(`[ZapSign] Lead ${lead.id} updated to SIGNED`);
                } else {
                    console.log('[ZapSign] No lead found for document:', docToken);
                }
            } catch (error) {
                console.error('[ZapSign] Error updating lead:', error);
            }

            return { success: true };
        }

        return { success: true, message: 'Event received' };
    }
}
