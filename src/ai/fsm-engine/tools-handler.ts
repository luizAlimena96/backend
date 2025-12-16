/**
 * FSM Tools Handler
 * 
 * Handles tool execution for FSM states.
 */

import { SchedulingToolsService } from '../tools/scheduling-tools.service';

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
    },
    services?: {
        schedulingTools?: SchedulingToolsService;
    }
): Promise<ToolExecutionResult> {
    console.log(`[FSM Tools] Executing tool: ${toolName}`, { args, context });

    if (!services?.schedulingTools) {
        return {
            success: false,
            error: 'Scheduling tools service not available',
            message: 'Serviço de agendamento não disponível.'
        };
    }

    switch (toolName) {
        case 'gerenciar_agenda':
            return await handleGerenciarAgenda(args, context, services.schedulingTools);

        default:
            return {
                success: false,
                error: `Unknown tool: ${toolName}`,
                message: `Ferramenta '${toolName}' não encontrada.`
            };
    }
}

/**
 * Handle gerenciar_agenda tool
 */
async function handleGerenciarAgenda(
    args: any,
    context: any,
    schedulingTools: SchedulingToolsService
): Promise<ToolExecutionResult> {
    try {
        const { acao, periodo_dia, data_especifica, horario_especifico, horarios_ja_oferecidos } = args;

        if (!acao) {
            return {
                success: false,
                message: 'Parâmetro "acao" é obrigatório.'
            };
        }

        if (!context.leadId) {
            return {
                success: false,
                message: 'Lead ID não encontrado no contexto.'
            };
        }

        const result = await schedulingTools.gerenciarAgenda(acao, {
            organizationId: context.organizationId,
            leadId: context.leadId,
            periodo_dia,
            data_especifica,
            horario_especifico,
            horarios_ja_oferecidos,
        });

        return {
            success: result.success,
            data: {
                horarios: result.horarios,
                disponivel: result.disponivel,
                agendamento: result.agendamento,
            },
            message: result.mensagem
        };

    } catch (error) {
        console.error('[FSM Tools] Error in gerenciar_agenda:', error);
        return {
            success: false,
            error: error.message,
            message: 'Erro ao executar ferramenta de agendamento.'
        };
    }
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
