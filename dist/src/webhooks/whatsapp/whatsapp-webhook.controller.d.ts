import { WhatsAppMessageService } from "./whatsapp-message.service";
export declare class WhatsAppWebhookController {
    private messageService;
    constructor(messageService: WhatsAppMessageService);
    handleWebhook(body: any): Promise<{
        success: boolean;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
    }>;
}
