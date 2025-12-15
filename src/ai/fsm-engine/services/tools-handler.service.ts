import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

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
    constructor(private prisma: PrismaService) { }

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
                case 'criar_evento':
                    return await this.handleCreateEvent(args, context);
                case 'cancelar_evento':
                    return await this.handleCancelEvent(args, context);
                case 'reagendar_evento':
                    return await this.handleRescheduleEvent(args, context);

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
            return { success: false, message: 'Não foi possível identificar o cliente.' };
        }

        // TODO: Implement cancellation logic
        return {
            success: true,
            message: 'Agendamento cancelado com sucesso.'
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
            return { success: false, message: 'Não foi possível identificar o cliente.' };
        }

        const { date, time } = args;
        if (!date || !time) {
            return { success: false, message: 'Por favor, informe a nova data e horário.' };
        }

        try {
            const parsedDate = this.parseDateInput(date, time);

            // TODO: Implement rescheduling logic
            return {
                success: true,
                message: 'Agendamento reagendado com sucesso.'
            };
        } catch (error) {
            return { success: false, message: 'Data inválida.' };
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
     */
    parseStateTools(state: any): string[] {
        if (!this.hasTools(state)) return [];

        try {
            const tools = typeof state.tools === 'string' ? JSON.parse(state.tools) : state.tools;
            return Array.isArray(tools) ? tools : [];
        } catch (error) {
            console.error('[FSM Tools] Error parsing tools:', error);
            return [];
        }
    }
}
