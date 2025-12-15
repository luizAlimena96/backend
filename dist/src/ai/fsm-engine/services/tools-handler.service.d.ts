import { PrismaService } from '../../../database/prisma.service';
export interface ToolExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    message: string;
}
export declare class ToolsHandlerService {
    private prisma;
    constructor(prisma: PrismaService);
    executeFSMTool(toolName: string, args: Record<string, any>, context: {
        organizationId: string;
        leadId?: string;
        conversationId: string;
    }): Promise<ToolExecutionResult>;
    private handleCreateEvent;
    private handleCancelEvent;
    private handleRescheduleEvent;
    private parseDateInput;
    private parseRelativeDate;
    hasTools(state: any): boolean;
    parseStateTools(state: any): string[];
}
