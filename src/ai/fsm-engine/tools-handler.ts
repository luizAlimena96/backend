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

        case 'criar_evento':
            // criar_evento is an alias that confirms and creates the appointment
            console.log('[FSM Tools] criar_evento called, delegating to gerenciar_agenda with acao=confirmar');
            return await handleGerenciarAgenda(
                { ...args, acao: 'confirmar' },
                context,
                services.schedulingTools
            );

        case 'cancelar_evento':
            // Cancel the most recent future appointment
            console.log('[FSM Tools] cancelar_evento called');
            return await handleCancelarEvento(context, services.schedulingTools);

        case 'reagendar_evento':
            // Reschedule to a new date/time
            console.log('[FSM Tools] reagendar_evento called');
            return await handleReagendarEvento(args, context, services.schedulingTools);

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
 * Handle cancelar_evento tool - cancels the next scheduled appointment
 */
async function handleCancelarEvento(
    context: any,
    schedulingTools: SchedulingToolsService
): Promise<ToolExecutionResult> {
    try {
        if (!context.leadId) {
            return {
                success: false,
                message: 'Lead ID não encontrado no contexto.'
            };
        }

        const result = await schedulingTools.cancelarUltimoAgendamento({
            organizationId: context.organizationId,
            leadId: context.leadId,
        });

        return {
            success: result.success,
            data: result.agendamento,
            message: result.mensagem
        };

    } catch (error) {
        console.error('[FSM Tools] Error in cancelar_evento:', error);
        return {
            success: false,
            error: error.message,
            message: 'Erro ao cancelar agendamento.'
        };
    }
}

/**
 * Handle reagendar_evento tool - reschedules to a new date/time
 */
async function handleReagendarEvento(
    args: any,
    context: any,
    schedulingTools: SchedulingToolsService
): Promise<ToolExecutionResult> {
    try {
        if (!context.leadId) {
            return {
                success: false,
                message: 'Lead ID não encontrado no contexto.'
            };
        }

        const { data_especifica, horario_especifico } = args;

        if (!data_especifica || !horario_especifico) {
            return {
                success: false,
                message: 'Preciso da nova data e horário para reagendar.'
            };
        }

        const result = await schedulingTools.reagendarUltimoAgendamento({
            organizationId: context.organizationId,
            leadId: context.leadId,
            data_especifica,
            horario_especifico,
        });

        return {
            success: result.success,
            data: result.agendamento,
            message: result.mensagem
        };

    } catch (error) {
        console.error('[FSM Tools] Error in reagendar_evento:', error);
        return {
            success: false,
            error: error.message,
            message: 'Erro ao reagendar compromisso.'
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
