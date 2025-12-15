import { Controller, Post, Body } from '@nestjs/common';

@Controller('webhooks/ai-control')
export class AIControlWebhookController {
    @Post()
    async handleAIControl(@Body() data: any) {
        console.log('[AI Control Webhook] Received:', data);

        // Handle AI control commands
        if (data.action === 'enable') {
            return { success: true, message: 'AI enabled' };
        } else if (data.action === 'disable') {
            return { success: true, message: 'AI disabled' };
        }

        return { success: false, message: 'Unknown action' };
    }
}
