/**
 * FSM Tools Handler
 * 
 * Handles tool execution for FSM states.
 */

import { SchedulingToolsService } from '../tools/scheduling-tools.service';
import { ContractToolsService } from '../tools/contract-tools.service';

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
        contractTools?: ContractToolsService;
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

        // ==================== CONTRACT TOOLS ====================
        case 'gerenciar_contrato':
        case 'verificar_dados_contrato':
        case 'enviar_contrato':
            console.log(`[FSM Tools] 📋 Contract tool called: ${toolName}`, args);
            if (!services?.contractTools) {
                console.error('[FSM Tools] ❌ Contract tools service not available!');
                return {
                    success: false,
                    error: 'Contract tools service not available',
                    message: 'Serviço de contratos não disponível. Entre em contato com o suporte.'
                };
            }
            return await handleContractTool(toolName, args, context, services.contractTools);

        default:
            console.warn(`[FSM Tools] ⚠️ Unknown tool requested: ${toolName}`);
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

        // Accept both formats: data_especifica or date, horario_especifico or time
        let data_especifica = args.data_especifica;
        let horario_especifico = args.horario_especifico || args.time;

        // If date is a relative string like "quinta-feira", convert it
        if (!data_especifica && args.date) {
            const dateStr = args.date.toLowerCase();
            const now = new Date();
            let targetDate: Date | null = null;

            // Parse relative date strings
            if (dateStr.includes('amanhã') || dateStr.includes('amanha')) {
                targetDate = new Date(now);
                targetDate.setDate(now.getDate() + 1);
            } else if (dateStr.includes('hoje')) {
                targetDate = new Date(now);
            } else {
                // Day name mapping
                const dayMap: Record<string, number> = {
                    'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2,
                    'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6
                };

                for (const [dayName, dayIndex] of Object.entries(dayMap)) {
                    if (dateStr.includes(dayName)) {
                        const currentDay = now.getDay();
                        let daysToAdd = dayIndex - currentDay;
                        if (daysToAdd <= 0) daysToAdd += 7;
                        targetDate = new Date(now);
                        targetDate.setDate(now.getDate() + daysToAdd);
                        break;
                    }
                }
            }

            if (targetDate) {
                data_especifica = targetDate.toISOString().split('T')[0];
                console.log(`[FSM Tools] reagendar_evento: Converted date '${args.date}' to '${data_especifica}'`);
            }
        }

        // Normalize time format (e.g., "10:00" -> "10:00")
        if (horario_especifico && !horario_especifico.includes(':')) {
            // Handle formats like "1000" -> "10:00"
            if (horario_especifico.length === 4) {
                horario_especifico = `${horario_especifico.slice(0, 2)}:${horario_especifico.slice(2)}`;
            } else if (horario_especifico.length === 3) {
                horario_especifico = `0${horario_especifico.slice(0, 1)}:${horario_especifico.slice(1)}`;
            }
        }

        console.log(`[FSM Tools] reagendar_evento: Final values - date: ${data_especifica}, time: ${horario_especifico}`);

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
            data: (result as any).agendamento,
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
 * Handle contract tools (gerenciar_contrato, verificar_dados_contrato, enviar_contrato)
 */
async function handleContractTool(
    toolName: string,
    args: any,
    context: any,
    contractTools: ContractToolsService
): Promise<ToolExecutionResult> {
    console.log(`[FSM Tools] 📋 handleContractTool called`, { toolName, args, context });

    try {
        if (!context.leadId) {
            console.error('[FSM Tools] ❌ No leadId in context');
            return {
                success: false,
                error: 'Lead ID required',
                message: 'É necessário um lead para gerenciar contratos.'
            };
        }

        // Map tool names to actions
        let acao: 'verificar_dados' | 'enviar_contrato';

        switch (toolName) {
            case 'verificar_dados_contrato':
                acao = 'verificar_dados';
                break;
            case 'enviar_contrato':
            case 'gerenciar_contrato':
                if (args.acao === 'verificar_dados') {
                    acao = 'verificar_dados';
                } else {
                    acao = 'enviar_contrato';
                }
                break;
            default:
                acao = 'enviar_contrato';
        }

        console.log(`[FSM Tools] 📋 Calling contractTools.gerenciarContrato with acao: ${acao}`);

        const result = await contractTools.gerenciarContrato(acao, {
            organizationId: context.organizationId,
            leadId: context.leadId,
            campos_obrigatorios: args.campos_obrigatorios || args.campos || undefined
        });

        console.log(`[FSM Tools] 📋 Contract tool result:`, result);

        return {
            success: result.success,
            data: {
                contrato_enviado: result.contrato_enviado,
                campos_faltantes: result.campos_faltantes,
                link_assinatura: result.link_assinatura
            },
            message: result.mensagem
        };
    } catch (error: any) {
        console.error(`[FSM Tools] ❌ Contract error:`, error);
        return {
            success: false,
            error: error.message,
            message: `Erro ao processar contrato: ${error.message}`
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
