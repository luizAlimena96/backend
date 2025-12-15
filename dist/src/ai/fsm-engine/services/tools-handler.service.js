"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolsHandlerService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../database/prisma.service");
let ToolsHandlerService = class ToolsHandlerService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async executeFSMTool(toolName, args, context) {
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
        }
        catch (error) {
            console.error(`[FSM Tools] Error executing ${toolName}:`, error);
            return {
                success: false,
                error: error.message,
                message: `Erro ao executar ferramenta: ${error.message}`
            };
        }
    }
    async handleCreateEvent(args, context) {
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
            return {
                success: true,
                data: {
                    agendamento_confirmado: 'sim',
                    date: parsedDate.toISOString()
                },
                message: 'Agendamento criado com sucesso!'
            };
        }
        catch (error) {
            return {
                success: false,
                error: 'Invalid date/time format',
                message: 'Não consegui entender a data e horário. Por favor, confirme o dia e hora desejados.'
            };
        }
    }
    async handleCancelEvent(args, context) {
        if (!context.leadId) {
            return { success: false, message: 'Não foi possível identificar o cliente.' };
        }
        return {
            success: true,
            message: 'Agendamento cancelado com sucesso.'
        };
    }
    async handleRescheduleEvent(args, context) {
        if (!context.leadId) {
            return { success: false, message: 'Não foi possível identificar o cliente.' };
        }
        const { date, time } = args;
        if (!date || !time) {
            return { success: false, message: 'Por favor, informe a nova data e horário.' };
        }
        try {
            const parsedDate = this.parseDateInput(date, time);
            return {
                success: true,
                message: 'Agendamento reagendado com sucesso.'
            };
        }
        catch (error) {
            return { success: false, message: 'Data inválida.' };
        }
    }
    parseDateInput(date, time) {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            let timeStr = time.replace('h', ':00').replace('H', ':00');
            if (!timeStr.includes(':'))
                timeStr += ':00';
            return new Date(`${date}T${timeStr}`);
        }
        return this.parseRelativeDate(date, time);
    }
    parseRelativeDate(dateStr, timeStr) {
        const now = new Date();
        let targetDate = new Date(now);
        const dateLower = dateStr.toLowerCase();
        if (dateLower.includes('depois') && (dateLower.includes('amanhã') || dateLower.includes('amanha'))) {
            targetDate.setDate(now.getDate() + 2);
        }
        else if (dateLower.includes('amanhã') || dateLower.includes('amanha')) {
            targetDate.setDate(now.getDate() + 1);
        }
        else {
            const dayMap = {
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
                if (daysToAdd <= 0)
                    daysToAdd += 7;
                targetDate.setDate(now.getDate() + daysToAdd);
            }
        }
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
    hasTools(state) {
        return state.tools && state.tools !== 'null' && state.tools !== '';
    }
    parseStateTools(state) {
        if (!this.hasTools(state))
            return [];
        try {
            const tools = typeof state.tools === 'string' ? JSON.parse(state.tools) : state.tools;
            return Array.isArray(tools) ? tools : [];
        }
        catch (error) {
            console.error('[FSM Tools] Error parsing tools:', error);
            return [];
        }
    }
};
exports.ToolsHandlerService = ToolsHandlerService;
exports.ToolsHandlerService = ToolsHandlerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ToolsHandlerService);
//# sourceMappingURL=tools-handler.service.js.map