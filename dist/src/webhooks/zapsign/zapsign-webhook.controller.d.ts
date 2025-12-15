export declare class ZapSignWebhookController {
    handleZapSignWebhook(data: any): Promise<{
        success: boolean;
        message?: undefined;
    } | {
        success: boolean;
        message: string;
    }>;
}
