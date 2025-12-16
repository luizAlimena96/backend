import { PrismaService } from '../../../database/prisma.service';
import { SchedulingToolsService } from '../../tools/scheduling-tools.service';
export interface ToolExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    message: string;
}
export declare class ToolsHandlerService {
    private prisma;
    private schedulingTools;
    constructor(prisma: PrismaService, schedulingTools: SchedulingToolsService);
    executeFSMTool(toolName: string, args: Record<string, any>, context: {
        organizationId: string;
        leadId?: string;
        conversationId: string;
    }): Promise<ToolExecutionResult>;
    private handleGerenciarAgenda;
    private handleCreateEvent;
    private handleCancelEvent;
    private handleRescheduleEvent;
    private parseDateInput;
    private parseRelativeDate;
    hasTools(state: any): boolean;
    parseStateTools(state: any): Array<{
        name: string;
        args?: any;
    }>;
}
