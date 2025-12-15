"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeFSMTool = executeFSMTool;
exports.hasTools = hasTools;
exports.parseStateTools = parseStateTools;
const prisma_1 = require("@/app/lib/prisma");
const aiSchedulingHandlers_1 = require("@/app/services/aiSchedulingHandlers");
async function executeFSMTool(toolName, args, context) {
    console.log(`[FSM Tools] Executing tool: ${toolName}`, { args, context });
    try {
        switch (toolName) {
            case 'criar_evento':
                return await handleCreateEvent(args, context);
            case 'cancelar_evento':
                return await handleCancelEvent(args, context);
            case 'reagendar_evento':
                return await handleRescheduleEvent(args, context);
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
async function handleCreateEvent(args, context) {
    if (!context.leadId) {
        return {
            success: false,
            error: 'Lead ID is required',
            message: 'Não foi possível criar o agendamento: lead não identificado.'
        };
    }
    const lead = await prisma_1.prisma.lead.findUnique({
        where: { id: context.leadId },
        select: { name: true }
    });
    if (!lead) {
        return {
            success: false,
            error: 'Lead not found',
            message: 'Não foi possível criar o agendamento: cliente não encontrado.'
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
    let parsedDate;
    try {
        parsedDate = parseDateInput(date, time);
    }
    catch (error) {
        return {
            success: false,
            error: 'Invalid date/time format',
            message: 'Não consegui entender a data e horário. Por favor, confirme o dia e hora desejados.'
        };
    }
    try {
        console.log('[Tools Handler] Calling handleBookMeeting with:', {
            date: parsedDate.toISOString().split('T')[0],
            time: parsedDate.toTimeString().split(' ')[0].substring(0, 5),
            leadId: context.leadId,
            orgId: context.organizationId
        });
        const result = await (0, aiSchedulingHandlers_1.handleBookMeeting)({
            date: parsedDate.toISOString().split('T')[0],
            time: parsedDate.toTimeString().split(' ')[0].substring(0, 5),
            leadName: lead.name || 'Cliente',
            notes: notes || 'Agendamento via IA'
        }, context.organizationId, context.leadId, context.conversationId);
        console.log('[Tools Handler] handleBookMeeting result:', result);
        if (result.success) {
            return {
                success: true,
                data: {
                    appointmentId: result.appointmentId,
                    agendamento_confirmado: 'sim'
                },
                message: result.message || 'Agendamento criado com sucesso!'
            };
        }
        else {
            return {
                success: false,
                error: result.error,
                message: `Erro ao criar agendamento: ${result.message || result.error}`
            };
        }
    }
    catch (error) {
        console.error('[Tools Handler] Unexpected error in handleBookMeeting:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Ocorreu um erro interno ao tentar criar o agendamento.'
        };
    }
}
async function handleCancelEvent(args, context) {
    if (!context.leadId) {
        return { success: false, message: 'Não foi possível identificar o cliente.' };
    }
    return await (0, aiSchedulingHandlers_1.handleCancelMeeting)(args, context.organizationId, context.leadId, context.conversationId);
}
async function handleRescheduleEvent(args, context) {
    if (!context.leadId) {
        return { success: false, message: 'Não foi possível identificar o cliente.' };
    }
    const { date, time } = args;
    if (!date || !time) {
        return { success: false, message: 'Por favor, informe a nova data e horário.' };
    }
    let parsedDate;
    try {
        parsedDate = parseDateInput(date, time);
    }
    catch (error) {
        return { success: false, message: 'Data inválida.' };
    }
    return await (0, aiSchedulingHandlers_1.handleRescheduleMeeting)({
        date: parsedDate.toISOString().split('T')[0],
        time: parsedDate.toTimeString().split(' ')[0].substring(0, 5)
    }, context.organizationId, context.leadId);
}
function parseDateInput(date, time) {
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        let timeStr = time.replace('h', ':00').replace('H', ':00');
        if (!timeStr.includes(':'))
            timeStr += ':00';
        return new Date(`${date}T${timeStr}`);
    }
    return parseRelativeDate(date, time);
}
function parseRelativeDate(dateStr, timeStr) {
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
            'sábado': 6, 'sabado': 6, 'sábado-feira': 6, 'sab': 6, 'sáb': 6
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
function hasTools(state) {
    return state.tools && state.tools !== 'null' && state.tools !== '';
}
function parseStateTools(state) {
    if (!hasTools(state))
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
//# sourceMappingURL=tools-handler.js.map