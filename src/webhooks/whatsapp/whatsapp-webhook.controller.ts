import { Controller, Post, Body, Inject } from "@nestjs/common";
import { WhatsAppMessageService } from "./whatsapp-message.service";
import { PrismaService } from "../../database/prisma.service";

@Controller("webhooks/whatsapp")
export class WhatsAppWebhookController {
  constructor(
    private messageService: WhatsAppMessageService,
    @Inject(PrismaService) private prisma: PrismaService,
  ) { }

  @Post()
  async handleWebhook(@Body() body: any) {
    const event = body.event;
    const instanceName = body.instance;

    // Handle connection status updates
    if (event === "connection.update") {
      await this.handleConnectionUpdate(instanceName, body.data);
      return { success: true, event: "connection.update" };
    }

    // Only process incoming messages
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

  /**
   * Handle connection.update events from Evolution API
   * Updates the whatsappConnected field in the Organization table
   */
  private async handleConnectionUpdate(instanceName: string, data: any) {
    if (!instanceName) {
      console.warn('[WhatsApp Webhook] connection.update without instance name');
      return;
    }

    try {
      // Extract connection state from the payload
      // Evolution API sends: { state: 'open' | 'close' | 'connecting' }
      const connectionState = data?.state || data?.connection || 'unknown';
      const isConnected = connectionState === 'open';

      console.log(`[WhatsApp Webhook] Connection update for ${instanceName}: ${connectionState} (connected: ${isConnected})`);

      // Find organization by instance name
      const organization = await this.prisma.organization.findUnique({
        where: { evolutionInstanceName: instanceName },
        select: { id: true, whatsappConnected: true },
      });

      if (!organization) {
        console.warn(`[WhatsApp Webhook] Organization not found for instance: ${instanceName}`);
        return;
      }

      // Only update if status changed
      if (organization.whatsappConnected !== isConnected) {
        await this.prisma.organization.update({
          where: { id: organization.id },
          data: {
            whatsappConnected: isConnected,
            whatsappConnectedAt: isConnected ? new Date() : null,
            whatsappLastConnected: isConnected ? new Date() : undefined,
            whatsappLastDisconnected: !isConnected ? new Date() : undefined,
          },
        });

        console.log(`[WhatsApp Webhook] ✅ Updated organization ${organization.id} - connected: ${isConnected}`);
      }
    } catch (error) {
      console.error('[WhatsApp Webhook] Error handling connection update:', error);
    }
  }
}

