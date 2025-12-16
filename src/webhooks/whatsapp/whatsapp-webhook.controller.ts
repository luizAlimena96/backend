import { Controller, Post, Body } from "@nestjs/common";
import { WhatsAppMessageService } from "./whatsapp-message.service";

@Controller("webhooks/whatsapp")
export class WhatsAppWebhookController {
  constructor(private messageService: WhatsAppMessageService) { }

  @Post()
  async handleWebhook(@Body() body: any) {
    const event = body.event;

    if (event !== "messages.upsert") {
      return { success: true };
    }

    const data = body.data;
    if (data.key.fromMe) {
      return { success: true };
    }

    // Process message in background (non-blocking)
    this.messageService.processIncomingMessage(body).catch(err => {
      console.error('[WhatsApp Webhook] Error processing message:', err);
    });

    return { success: true, message: "Processing" };
  }
}
