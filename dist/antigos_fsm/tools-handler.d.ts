export interface ToolExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    message: string;
}
export declare function executeFSMTool(toolName: string, args: Record<string, any>, context: {
    organizationId: string;
    leadId?: string;
    conversationId: string;
}): Promise<ToolExecutionResult>;
export declare function hasTools(state: any): boolean;
export declare function parseStateTools(state: any): string[];
