import { PrismaService } from "../database/prisma.service";
import { WhatsAppIntegrationService } from "../integrations/whatsapp/whatsapp-integration.service";
export declare class RemindersService {
    private prisma;
    private whatsappService;
    constructor(prisma: PrismaService, whatsappService: WhatsAppIntegrationService);
    findAll(agentId: string): Promise<{
        isActive: boolean;
        id: string;
        message: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        mediaType: string;
        scheduledFor: Date;
        recipients: string[];
        advanceTime: number | null;
    }[]>;
    create(data: any): Promise<{
        isActive: boolean;
        id: string;
        message: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        mediaType: string;
        scheduledFor: Date;
        recipients: string[];
        advanceTime: number | null;
    }>;
    update(id: string, data: any): Promise<{
        isActive: boolean;
        id: string;
        message: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        mediaType: string;
        scheduledFor: Date;
        recipients: string[];
        advanceTime: number | null;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    sendPendingReminders(): Promise<{
        processed: number;
        success: number;
        errors: number;
    }>;
}
