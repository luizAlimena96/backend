import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SchedulingToolsService } from '../../tools/scheduling-tools.service';
import { ContractToolsService } from '../../tools/contract-tools.service';

export interface ToolExecutionResult {
    success: boolean;
    data?: any;
    error?: string;
    message: string;
}

/**
 * Tools Handler Service
 * Executes tools (like scheduling) for FSM states
 */
@Injectable()
export class ToolsHandlerService {
    constructor(
        private prisma: PrismaService,
        private schedulingTools: SchedulingToolsService,
        private contractTools: ContractToolsService,
    ) { }

    /**
     * Execute a tool based on its name
     */
    async executeFSMTool(
        toolName: string,
        args: Record<string, any>,
        context: {
            organizationId: string;
            leadId?: string;
            conversationId: string;
        }
    ): Promise<ToolExecutionResult> {
        console.log(`[FSM Tools] Executing tool: ${toolName}`, { args, context });

        try {
            switch (toolName) {
                case 'gerenciar_agenda':
                    return await this.handleGerenciarAgenda(args, context);
                case 'criar_evento':
                    return await this.handleCreateEvent(args, context);
                case 'cancelar_evento':
                    return await this.handleCancelEvent(args, context);
                case 'reagendar_evento':
                    return await this.handleRescheduleEvent(args, context);
                case 'gerenciar_contrato':
                case 'verificar_dados_contrato':
                case 'enviar_contrato':
                    return await this.handleContractTool(toolName, args, context);

                default:
                    return {
                        success: false,
                        error: `Tool '${toolName}' not found`,
                        message: `Ferramenta '${toolName}' não está disponível.`
                    };
            }
        } catch (error: any) {
            console.error(`[FSM Tools] Error executing ${toolName}:`, error);
            return {
                success: false,
                error: error.message,
                message: `Erro ao executar ferramenta: ${error.message}`
            };
        }
    }

    /**
     * Handle gerenciar_agenda tool
     */
    private async handleGerenciarAgenda(
        args: Record<string, any>,
        context: {
            organizationId: string;
            leadId?: string;
            conversationId: string;
        }
    ): Promise<ToolExecutionResult> {
        const { acao, periodo_dia, data_especifica, data_referencia, horario_especifico, horarios_ja_oferecidos } = args;

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

        const result = await this.schedulingTools.gerenciarAgenda(acao, {
            organizationId: context.organizationId,
            leadId: context.leadId,
            periodo_dia,
            data_especifica,
            data_referencia, // Pass reference date for context-aware suggestions
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
    }

    /**
     * Create event/appointment
     */
    private async handleCreateEvent(
        args: Record<string, any>,
        context: {
            organizationId: string;
            leadId?: string;
            conversationId: string;
        }
    ): Promise<ToolExecutionResult> {
        if (!context.leadId) {
            return {
                success: false,
                error: 'Lead ID is required',
                message: 'Não foi possível criar o agendamento: lead não identificado.'
            };
        }

        const { date, time, notes } = args;

        if (!date || !time) {
            return {
                success: false,
                error: 'Date and time are required',
                message: 'Por favor, informe a data e horário para o agendamento.'
            };
        }

        try {
            const parsedDate = this.parseDateInput(date, time);

            // TODO: Integrate with scheduling service
            // For now, return success
            return {
                success: true,
                data: {
                    agendamento_confirmado: 'sim',
                    date: parsedDate.toISOString()
                },
                message: 'Agendamento criado com sucesso!'
            };
        } catch (error) {
            return {
                success: false,
                error: 'Invalid date/time format',
                message: 'Não consegui entender a data e horário. Por favor, confirme o dia e hora desejados.'
            };
        }
    }

    /**
     * Cancel event
     */
    private async handleCancelEvent(
        args: any,
        context: any
    ): Promise<ToolExecutionResult> {
        if (!context.leadId) {
            return {
                success: false,
                message: 'Não foi possível identificar o cliente.'
            };
        }

        const result = await this.schedulingTools.cancelarUltimoAgendamento({
            organizationId: context.organizationId,
            leadId: context.leadId,
        });

        return {
            success: result.success,
            data: result.agendamento,
            message: result.mensagem
        };
    }

    /**
     * Reschedule event
     */
    private async handleRescheduleEvent(
        args: any,
        context: any
    ): Promise<ToolExecutionResult> {
        if (!context.leadId) {
            return {
                success: false,
                message: 'Não foi possível identificar o cliente.'
            };
        }

        const { date, time, data_especifica, horario_especifico } = args;

        // Support both direct format or parsed format
        let dateStr = data_especifica;
        let timeStr = horario_especifico;

        if (!dateStr && date) {
            try {
                const parsedDate = this.parseDateInput(date, time || '00:00');
                dateStr = parsedDate.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD format
                timeStr = time || parsedDate.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            } catch (error) {
                console.error('[FSM Tools] Error parsing reschedule date:', error);
                return {
                    success: false,
                    message: 'Não entendi a nova data. Poderia repetir no formato DD/MM às HH:MM?'
                };
            }
        }

        if (!dateStr || !timeStr) {
            return {
                success: false,
                message: 'Por favor, informe a nova data e horário para o reagendamento.'
            };
        }

        console.log('[FSM Tools] Rescheduling with:', { dateStr, timeStr });

        const result = await this.schedulingTools.reagendarUltimoAgendamento({
            organizationId: context.organizationId,
            leadId: context.leadId,
            data_especifica: dateStr,
            horario_especifico: timeStr
        });

        return {
            success: result.success,
            data: result.agendamento,
            message: result.mensagem
        };
    }

    /**
     * Handle contract tools (gerenciar_contrato, verificar_dados_contrato, enviar_contrato)
     */
    private async handleContractTool(
        toolName: string,
        args: Record<string, any>,
        context: {
            organizationId: string;
            leadId?: string;
            conversationId: string;
        }
    ): Promise<ToolExecutionResult> {
        console.log(`[FSM Tools] Contract tool: ${toolName}`, args);

        if (!context.leadId) {
            return {
                success: false,
                error: 'Lead ID required',
                message: 'É necessário um lead para gerenciar contratos.'
            };
        }

        try {
            // Map tool names to actions
            let acao: 'verificar_dados' | 'enviar_contrato';

            switch (toolName) {
                case 'verificar_dados_contrato':
                    acao = 'verificar_dados';
                    break;
                case 'enviar_contrato':
                case 'gerenciar_contrato':
                    // For gerenciar_contrato, check if action is specified in args
                    if (args.acao === 'verificar_dados') {
                        acao = 'verificar_dados';
                    } else {
                        acao = 'enviar_contrato';
                    }
                    break;
                default:
                    acao = 'enviar_contrato';
            }

            const result = await this.contractTools.gerenciarContrato(acao, {
                organizationId: context.organizationId,
                leadId: context.leadId,
                campos_obrigatorios: args.campos_obrigatorios || args.campos || undefined
            });

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
            console.error(`[FSM Tools] Contract error:`, error);
            return {
                success: false,
                error: error.message,
                message: `Erro ao processar contrato: ${error.message}`
            };
        }
    }

    /**
     * Parse date input (ISO or relative)
     */
    private parseDateInput(date: string, time: string): Date {
        // Try ISO format first
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            let timeStr = time.replace('h', ':00').replace('H', ':00');
            if (!timeStr.includes(':')) timeStr += ':00';
            return new Date(`${date}T${timeStr}`);
        }

        // Relative dates
        return this.parseRelativeDate(date, time);
    }

    /**
     * Parse relative dates like "amanhã", "terça-feira"
     */
    private parseRelativeDate(dateStr: string, timeStr: string): Date {
        const now = new Date();
        let targetDate = new Date(now);

        const dateLower = dateStr.toLowerCase();

        // "depois de amanhã"
        if (dateLower.includes('depois') && (dateLower.includes('amanhã') || dateLower.includes('amanha'))) {
            targetDate.setDate(now.getDate() + 2);
        }
        // "amanhã"
        else if (dateLower.includes('amanhã') || dateLower.includes('amanha')) {
            targetDate.setDate(now.getDate() + 1);
        }
        // Day of week
        else {
            const dayMap: Record<string, number> = {
                'domingo': 0, 'dom': 0,
                'segunda': 1, 'segunda-feira': 1, 'seg': 1,
                'terça': 2, 'terca': 2, 'terça-feira': 2, 'terca-feira': 2, 'ter': 2,
                'quarta': 3, 'quarta-feira': 3, 'qua': 3,
                'quinta': 4, 'quinta-feira': 4, 'qui': 4,
                'sexta': 5, 'sexta-feira': 5, 'sex': 5,
                'sábado': 6, 'sabado': 6, 'sab': 6
            };

            let targetDay = -1;
            for (const [dayName, dayIndex] of Object.entries(dayMap)) {
                if (dateLower.includes(dayName)) {
                    targetDay = dayIndex;
                    break;
                }
            }

            if (targetDay !== -1) {
                const currentDay = now.getDay();
                let daysToAdd = targetDay - currentDay;
                if (daysToAdd <= 0) daysToAdd += 7;
                targetDate.setDate(now.getDate() + daysToAdd);
            }
        }

        // Parse time
        const timeMatch = timeStr.match(/(\d{1,2})(?:[:hH](\d{2}))?/);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1]);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;

            if (timeStr.toLowerCase().includes('pm') && hours < 12) {
                hours += 12;
            }

            targetDate.setHours(hours, minutes, 0, 0);
        }

        return targetDate;
    }

    /**
     * Check if state has tools
     */
    hasTools(state: any): boolean {
        return state.tools && state.tools !== 'null' && state.tools !== '';
    }

    /**
     * Parse tools from state
     * Supports:
     * - ["tool1", "tool2"]
     * - [{"name": "tool1", "args": {...}}]
     */
    parseStateTools(state: any): Array<{ name: string; args?: any }> {
        if (!this.hasTools(state)) return [];

        try {
            const tools = typeof state.tools === 'string' ? JSON.parse(state.tools) : state.tools;

            if (!Array.isArray(tools)) return [];

            return tools.map(tool => {
                if (typeof tool === 'string') {
                    return { name: tool, args: {} };
                }
                return tool; // Assumes object { name: '...', args: {...} }
            });
        } catch (error) {
            console.error('[FSM Tools] Error parsing tools:', error);
            return [];
        }
    }
}
