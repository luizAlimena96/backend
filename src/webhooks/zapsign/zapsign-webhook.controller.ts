import { Controller, Post, Body } from '@nestjs/common';

@Controller('webhooks/zapsign')
export class ZapSignWebhookController {
    @Post()
    async handleZapSignWebhook(@Body() data: any) {
        console.log('[ZapSign Webhook] Received:', data);

        // Handle ZapSign events
        if (data.event === 'document.signed') {
            console.log('[ZapSign] Document signed:', data.document_id);
            return { success: true };
        }

        return { success: true, message: 'Event received' };
    }
}
