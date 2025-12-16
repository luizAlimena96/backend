import { RemindersService } from "./reminders.service";
export declare class RemindersController {
    private remindersService;
    constructor(remindersService: RemindersService);
    findAll(agentId: string): Promise<{
        message: string;
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        title: string;
        scheduledFor: Date;
        mediaType: string;
        recipients: string[];
        advanceTime: number | null;
    }[]>;
    create(data: any): Promise<{
        message: string;
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        title: string;
        scheduledFor: Date;
        mediaType: string;
        recipients: string[];
        advanceTime: number | null;
    }>;
    update(id: string, data: any): Promise<{
        message: string;
        id: string;
        organizationId: string;
        agentId: string;
        createdAt: Date;
        isActive: boolean;
        updatedAt: Date;
        title: string;
        scheduledFor: Date;
        mediaType: string;
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
