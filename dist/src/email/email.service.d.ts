import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private resend;
    private readonly apiKey;
    private fromEmail;
    constructor(configService: ConfigService);
    sendPasswordResetEmail(email: string, resetLink: string, userName?: string): Promise<{
        success: boolean;
        error?: string;
    }>;
}
