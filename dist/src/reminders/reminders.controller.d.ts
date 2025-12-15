import { RemindersService } from "./reminders.service";
export declare class RemindersController {
    private remindersService;
    constructor(remindersService: RemindersService);
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
    sendPending(): Promise<{
        processed: number;
        success: number;
        errors: number;
    }>;
}
