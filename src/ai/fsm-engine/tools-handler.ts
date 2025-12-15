/**
 * FSM Tools Handler (Stubbed for Backend)
 * 
 * Handles tool execution for FSM states.
 * NOTE: Full implementation requires porting aiSchedulingHandlers to backend.
 */

export interface ToolExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    message: string;
}

/**
 * Execute a tool based on its name and arguments
 */
export async function executeFSMTool(
    toolName: string,
    args: Record<string, any>,
    context: {
        organizationId: string;
        leadId?: string;
        conversationId: string;
    }
): Promise<ToolExecutionResult> {
    console.log(`[FSM Tools] Executing tool (STUB): ${toolName}`, { args, context });

    // TODO: Implement actual tool handlers in backend
    return {
        success: false,
        error: 'Tool execution not implemented in backend yet',
        message: `Ferramenta '${toolName}' ainda não está disponível no backend.`
    };
}

/**
 * Check if a state has tools configured
 */
export function hasTools(state: any): boolean {
    return state.tools && state.tools !== 'null' && state.tools !== '';
}

/**
 * Parse tools from state
 */
export function parseStateTools(state: any): string[] {
    if (!hasTools(state)) return [];

    try {
        const tools = typeof state.tools === 'string' ? JSON.parse(state.tools) : state.tools;
        return Array.isArray(tools) ? tools : [];
    } catch (error) {
        console.error('[FSM Tools] Error parsing tools:', error);
        return [];
    }
}
