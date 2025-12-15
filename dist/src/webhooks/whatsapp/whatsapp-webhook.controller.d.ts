import { PrismaService } from "../../database/prisma.service";
export declare class WhatsAppWebhookController {
    private prisma;
    constructor(prisma: PrismaService);
    handleWebhook(body: any): Promise<{
        success: boolean;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
    }>;
}
