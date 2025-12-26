import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SchedulingService } from '../../common/services/scheduling.service';

@Injectable()
export class SchedulingToolsService {
    constructor(
        private prisma: PrismaService,
        private schedulingService: SchedulingService,
    ) { }

    /**
     * Parse horario_escolhido in multiple formats:
     * - "(DD/MM) às HHMM" or "(DD/MM/YYYY) às HHMM"
     * - "DD/MM às HHMM" or "DD/MM/YYYY às HHMM"
     * - "DD/MM às HH:MM"
     * - "segunda às 11:00" (day names converted to dates)
     * Returns { data_especifica: 'YYYY-MM-DD', horario_especifico: 'HH:MM' }
     */
    parseHorarioEscolhido(horario: string): {
        data_especifica: string;
        horario_especifico: string;
    } | null {
        if (!horario) return null;

        console.log('[Scheduling Tools] 🔍 parseHorarioEscolhido input:', horario);

        const now = new Date();
        let day: number | null = null;
        let month: number | null = null;
        let year: number = now.getFullYear();
        let hours: string | null = null;
        let minutes: string = '00';

        // Try to extract TIME first (required)
        // Format: "às HHMM" or "às HH:MM" or "às Hh" etc.
        let timeMatch = horario.match(/às\s*(\d{1,2})[:h]?(\d{2})?/i);
        if (!timeMatch) timeMatch = horario.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) timeMatch = horario.match(/(\d{1,2})h(\d{2})?/i);

        if (timeMatch) {
            hours = timeMatch[1].padStart(2, '0');
            minutes = (timeMatch[2] || '00').padStart(2, '0');
        }

        if (!hours) {
            console.log('[Scheduling Tools] ❌ parseHorarioEscolhido: No time found');
            return null;
        }

        // Try to extract DATE
        // Format 1: DD/MM/YYYY or DD/MM or (DD/MM) or (DD/MM/YYYY)
        const dateMatch = horario.match(/\(?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\)?/);

        if (dateMatch) {
            day = parseInt(dateMatch[1]);
            month = parseInt(dateMatch[2]);
            if (dateMatch[3]) {
                year = parseInt(dateMatch[3]);
                if (year < 100) year = 2000 + year;
            }
        }

        // Format 2: Day names (segunda, terça, etc.)
        if (!day) {
            const dayMap: Record<string, number> = {
                'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2,
                'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6
            };

            const horarioLower = horario.toLowerCase();

            for (const [dayName, dayIndex] of Object.entries(dayMap)) {
                if (horarioLower.includes(dayName)) {
                    const currentDay = now.getDay();
                    let daysToAdd = dayIndex - currentDay;
                    if (daysToAdd <= 0) daysToAdd += 7; // If today or past, go to next week

                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + daysToAdd);

                    day = targetDate.getDate();
                    month = targetDate.getMonth() + 1;
                    year = targetDate.getFullYear();

                    console.log(`[Scheduling Tools] 📅 Converted day name "${dayName}" to date:`, { day, month, year });
                    break;
                }
            }

            // Check for relative dates: amanhã, hoje, depois de amanhã
            if (!day) {
                if (horarioLower.includes('depois') && (horarioLower.includes('amanhã') || horarioLower.includes('amanha'))) {
                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + 2);
                    day = targetDate.getDate();
                    month = targetDate.getMonth() + 1;
                    year = targetDate.getFullYear();
                } else if (horarioLower.includes('amanhã') || horarioLower.includes('amanha')) {
                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + 1);
                    day = targetDate.getDate();
                    month = targetDate.getMonth() + 1;
                    year = targetDate.getFullYear();
                } else if (horarioLower.includes('hoje')) {
                    day = now.getDate();
                    month = now.getMonth() + 1;
                    year = now.getFullYear();
                }
            }
        }

        if (!day || !month) {
            console.log('[Scheduling Tools] ❌ parseHorarioEscolhido: No date found');
            return null;
        }

        // Validate date parts
        if (day < 1 || day > 31 || month < 1 || month > 12) {
            console.log('[Scheduling Tools] ❌ parseHorarioEscolhido: Invalid date values');
            return null;
        }

        // Check if date is in the past, if so use next year (only for DD/MM format without year)
        const parsedDate = new Date(year, month - 1, day);
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (parsedDate < todayMidnight && year === now.getFullYear()) {
            year = year + 1;
            console.log('[Scheduling Tools] 📅 Date was in past, adjusted to next year:', year);
        }

        const data_especifica = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const horario_especifico = `${hours}:${minutes}`;

        console.log('[Scheduling Tools] ✅ parseHorarioEscolhido result:', { data_especifica, horario_especifico });

        return { data_especifica, horario_especifico };
    }

    /**
     * Confirm appointment directly from horario_escolhido string
     * This is the preferred method when the format is "(DD/MM) às HHMM"
     */
    async confirmarPorHorarioEscolhido(params: {
        organizationId: string;
        leadId: string;
        horario_escolhido: string;
    }): Promise<{
        success: boolean;
        agendamento?: any;
        mensagem: string;
    }> {
        console.log('[Scheduling Tools] 📅 confirmarPorHorarioEscolhido called:', params.horario_escolhido);

        const parsed = this.parseHorarioEscolhido(params.horario_escolhido);

        if (!parsed) {
            return {
                success: false,
                mensagem: `Formato de horário inválido: "${params.horario_escolhido}". Esperado: (DD/MM) às HHMM`
            };
        }

        return this.confirmarAgendamento({
            organizationId: params.organizationId,
            leadId: params.leadId,
            data_especifica: parsed.data_especifica,
            horario_especifico: parsed.horario_especifico,
        });
    }

    async gerenciarAgenda(
        acao: 'sugerir_iniciais' | 'verificar_disponibilidade' | 'confirmar' | 'cancelar' | 'reagendar',
        params: {
            organizationId: string;
            leadId: string;
            periodo_dia?: 'manha' | 'tarde' | 'noite';
            data_especifica?: string;
            data_referencia?: string; // YYYY-MM-DD - Reference date for suggestions when client asked for specific day
            horario_especifico?: string;
            horarios_ja_oferecidos?: string[];
        }
    ): Promise<{
        success: boolean;
        horarios?: Array<{ dia: string; horario: string; data_completa: Date }>;
        disponivel?: boolean;
        agendamento?: any;
        mensagem: string;
    }> {
        console.log(`[Scheduling Tools] gerenciar_agenda - ${acao}`, params);

        switch (acao) {
            case 'sugerir_iniciais':
                return this.sugerirHorariosIniciais(params);

            case 'verificar_disponibilidade':
                return this.verificarDisponibilidade(params);

            case 'confirmar':
                return this.confirmarAgendamento(params);

            case 'cancelar':
                return this.cancelarUltimoAgendamento(params);

            case 'reagendar':
                return this.reagendarUltimoAgendamento(params);

            default:
                return {
                    success: false,
                    mensagem: `Ação '${acao}' não reconhecida.`
                };
        }
    }

    private async sugerirHorariosIniciais(params: {
        organizationId: string;
        leadId: string;
        periodo_dia?: 'manha' | 'tarde' | 'noite';
        horarios_ja_oferecidos?: string[];
        data_referencia?: string;
    }) {
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: params.leadId },
                include: {
                    agent: true
                }
            });
            if (!lead?.agent) {
                return {
                    success: false,
                    mensagem: 'Lead ou agente não encontrado.'
                };
            }
            if (!lead.crmStageId) {
                return {
                    success: false,
                    mensagem: 'Lead não está em nenhuma etapa do CRM.'
                };
            }
            const config = await this.prisma.autoSchedulingConfig.findFirst({
                where: {
                    agentId: lead.agent.id,
                    crmStageId: lead.crmStageId,
                    isActive: true,
                }
            });

            if (!config) {
                return {
                    success: false,
                    mensagem: 'Configuração de agendamento não encontrada para esta etapa.'
                };
            }

            const now = new Date();
            const minAdvanceMs = config.minAdvanceHours * 60 * 60 * 1000;
            const minDate = new Date(now.getTime() + minAdvanceMs);

            // If data_referencia is provided, start searching from that date (if it's >= minDate)
            let startDate = minDate;
            if (params.data_referencia) {
                const [year, month, day] = params.data_referencia.split('-').map(Number);
                const referenceDate = new Date(year, month - 1, day, 0, 0, 0);
                // Use reference date if it's in the future, otherwise use minDate
                if (referenceDate >= minDate) {
                    startDate = referenceDate;
                    console.log(`[Scheduling Tools] 📅 Using reference date: ${params.data_referencia}`);
                } else {
                    console.log(`[Scheduling Tools] 📅 Reference date ${params.data_referencia} is before minDate, using minDate instead`);
                }
            }

            const horariosSugeridos: Array<{ dia: string; horario: string; data_completa: Date }> = [];
            const maxDias = 14;

            for (let i = 0; i < maxDias && horariosSugeridos.length < 2; i++) {
                const checkDate = new Date(startDate);
                checkDate.setDate(checkDate.getDate() + i);

                const slotDuration = config.duration || 30;
                const slots = await this.schedulingService.getAvailableSlots(
                    params.organizationId,
                    checkDate,
                    lead.agent.id,
                    slotDuration
                );

                const slotsFiltrados = this.filtrarPorPeriodo(slots, params.periodo_dia);

                // Filter already offered slots (use Brazil timezone for comparison)
                const brazilTz = { timeZone: 'America/Sao_Paulo' };
                const slotsNovos = slotsFiltrados.filter(slot => {
                    const horarioStr = `${slot.time.toLocaleDateString('pt-BR', brazilTz)} ${slot.time.toLocaleTimeString('pt-BR', { ...brazilTz, hour: '2-digit', minute: '2-digit' })}`;
                    return !params.horarios_ja_oferecidos?.includes(horarioStr);
                });

                console.log('[Scheduling Tools] 📅 Available slots for', checkDate.toISOString().split('T')[0], ':',
                    slotsNovos.slice(0, 5).map(s => s.time.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }))
                );

                for (const slot of slotsNovos) {
                    if (horariosSugeridos.length >= 2) break;

                    // IMPORTANT: Skip slots that don't respect minimum advance time
                    if (slot.time < minDate) continue;

                    const brazilOptions = { timeZone: 'America/Sao_Paulo' };
                    horariosSugeridos.push({
                        dia: slot.time.toLocaleDateString('pt-BR', { ...brazilOptions, weekday: 'long', day: '2-digit', month: 'long' }),
                        horario: slot.time.toLocaleTimeString('pt-BR', { ...brazilOptions, hour: '2-digit', minute: '2-digit' }),
                        data_completa: slot.time
                    });
                }
            }

            if (horariosSugeridos.length === 0) {
                return {
                    success: false,
                    mensagem: 'Não há horários disponíveis nos próximos dias.'
                };
            }

            if (horariosSugeridos.length === 1) {
                return {
                    success: true,
                    horarios: horariosSugeridos,
                    mensagem: `Encontrei apenas um horário disponível: ${horariosSugeridos[0].dia} às ${horariosSugeridos[0].horario}.`
                };
            }

            return {
                success: true,
                horarios: horariosSugeridos,
                mensagem: `Horários disponíveis: ${horariosSugeridos[0].dia} às ${horariosSugeridos[0].horario} ou ${horariosSugeridos[1].dia} às ${horariosSugeridos[1].horario}.`
            };

        } catch (error: any) {
            console.error('[Scheduling Tools] Erro ao sugerir horários:', error);
            return {
                success: false,
                mensagem: 'Erro ao buscar horários disponíveis.'
            };
        }
    }

    private async verificarDisponibilidade(params: {
        organizationId: string;
        leadId: string;
        data_especifica?: string;
        horario_especifico?: string;
    }) {
        try {
            if (!params.data_especifica || !params.horario_especifico) {
                return {
                    success: false,
                    mensagem: 'Data e horário são obrigatórios para verificar disponibilidade.'
                };
            }

            const [hours, minutes] = params.horario_especifico.split(':').map(Number);
            const dataHora = new Date(params.data_especifica);
            dataHora.setHours(hours, minutes, 0, 0);

            const lead = await this.prisma.lead.findUnique({
                where: { id: params.leadId },
                include: { agent: true }
            });

            const slots = await this.schedulingService.getAvailableSlots(
                params.organizationId,
                dataHora,
                lead?.agent?.id
            );

            const disponivel = slots.some(slot =>
                Math.abs(slot.time.getTime() - dataHora.getTime()) < 60000
            );

            return {
                success: true,
                disponivel,
                mensagem: disponivel
                    ? `O horário ${params.data_especifica} às ${params.horario_especifico} está disponível!`
                    : `Infelizmente o horário ${params.data_especifica} às ${params.horario_especifico} não está disponível.`
            };

        } catch (error: any) {
            console.error('[Scheduling Tools] Erro ao verificar disponibilidade:', error);
            return {
                success: false,
                disponivel: false,
                mensagem: 'Erro ao verificar disponibilidade.'
            };
        }
    }

    private async confirmarAgendamento(params: {
        organizationId: string;
        leadId: string;
        data_especifica?: string;
        horario_especifico?: string;
    }) {
        console.log('[Scheduling Tools] 🔍 DEBUG - confirmarAgendamento:');
        console.log('[Scheduling Tools]   - organizationId:', params.organizationId);
        console.log('[Scheduling Tools]   - leadId:', params.leadId);
        console.log('[Scheduling Tools]   - data_especifica:', params.data_especifica);
        console.log('[Scheduling Tools]   - horario_especifico:', params.horario_especifico);

        try {
            if (!params.data_especifica || !params.horario_especifico) {
                console.log('[Scheduling Tools] ❌ Missing date or time');
                return {
                    success: false,
                    mensagem: 'Data e horário são obrigatórios para confirmar o agendamento.'
                };
            }

            const lead = await this.prisma.lead.findUnique({
                where: { id: params.leadId },
                include: { agent: true }
            });

            console.log('[Scheduling Tools]   - lead found:', !!lead);
            console.log('[Scheduling Tools]   - lead.name:', lead?.name);
            console.log('[Scheduling Tools]   - lead.agent.id:', lead?.agent?.id);
            console.log('[Scheduling Tools]   - lead.crmStageId:', lead?.crmStageId);

            if (!lead?.agent) {
                console.log('[Scheduling Tools] ❌ Lead or agent not found');
                return {
                    success: false,
                    mensagem: 'Agente não encontrado.'
                };
            }

            let config: { duration?: number } | null = null;
            if (lead.crmStageId) {
                config = await this.prisma.autoSchedulingConfig.findFirst({
                    where: {
                        agentId: lead.agent.id,
                        crmStageId: lead.crmStageId,
                        isActive: true,
                    }
                });
            }

            console.log('[Scheduling Tools]   - crmStageId:', lead.crmStageId || 'N/A');
            console.log('[Scheduling Tools]   - autoSchedulingConfig found:', !!config);
            console.log('[Scheduling Tools]   - config.duration:', config?.duration || 'using default 60');

            // ==================== DELETE EXISTING APPOINTMENTS ====================
            // A lead can only have ONE active appointment at a time
            // Find and DELETE any existing appointments for this lead
            const existingAppointments = await this.prisma.appointment.findMany({
                where: {
                    leadId: params.leadId,
                    organizationId: params.organizationId,
                }
            });

            if (existingAppointments.length > 0) {
                console.log(`[Scheduling Tools] 🗑️ Found ${existingAppointments.length} existing appointment(s) for this lead - DELETING...`);

                for (const existingApt of existingAppointments) {
                    // Delete associated reminders first
                    await this.prisma.appointmentReminder.deleteMany({
                        where: {
                            appointmentId: existingApt.id,
                        }
                    });

                    // Delete the appointment (also removes from Google Calendar)
                    await this.schedulingService.cancelAppointment(existingApt.id);
                    console.log(`[Scheduling Tools] 🗑️ Deleted existing appointment: ${existingApt.id} (was scheduled for ${existingApt.scheduledAt.toISOString()})`);
                }
            }
            // ==================== END DELETE EXISTING ====================

            const [hours, minutes] = params.horario_especifico.split(':').map(Number);
            const [year, month, day] = params.data_especifica.split('-').map(Number);

            const scheduledAt = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0, 0));

            console.log('[Scheduling Tools] 🕐 Timezone conversion:', {
                input_date: params.data_especifica,
                input_time: params.horario_especifico,
                brazil_time: `${params.data_especifica} ${params.horario_especifico} (UTC-3)`,
                utc_time: scheduledAt.toISOString(),
            });

            const appointment = await this.schedulingService.createAppointment({
                leadId: params.leadId,
                title: `Reunião com ${lead.name}`,
                scheduledAt,
                duration: config?.duration || 60,
                type: 'MEETING',
                organizationId: params.organizationId,
            });

            console.log('[Scheduling Tools] ✅ Appointment created successfully:', appointment.id);

            return {
                success: true,
                agendamento: appointment,
                mensagem: `✅ Agendamento confirmado para ${scheduledAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${scheduledAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}!`
            };

        } catch (error: any) {
            console.error('[Scheduling Tools] ❌ Erro ao confirmar agendamento:', error);
            console.error('[Scheduling Tools]   - Error message:', error.message);

            if (error.message?.includes('SLOT_OCCUPIED')) {
                return {
                    success: false,
                    mensagem: '⚠️ Infelizmente esse horário acabou de ser ocupado! Por favor, escolha outro horário disponível.'
                };
            }

            return {
                success: false,
                mensagem: 'Erro ao criar agendamento.'
            };
        }
    }

    private filtrarPorPeriodo(
        slots: Array<{ time: Date; available: boolean }>,
        periodo?: 'manha' | 'tarde' | 'noite'
    ) {
        if (!periodo) return slots;

        return slots.filter(slot => {
            const brazilHour = parseInt(slot.time.toLocaleTimeString('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                hour: '2-digit',
                hour12: false
            }));

            switch (periodo) {
                case 'manha':
                    return brazilHour >= 6 && brazilHour < 12;
                case 'tarde':
                    return brazilHour >= 12 && brazilHour < 18;
                case 'noite':
                    return brazilHour >= 18 && brazilHour < 22;
                default:
                    return true;
            }
        });
    }

    async cancelarUltimoAgendamento(params: {
        organizationId: string;
        leadId: string;
    }) {
        try {
            const appointment = await this.prisma.appointment.findFirst({
                where: {
                    leadId: params.leadId,
                    organizationId: params.organizationId,
                    status: 'SCHEDULED',
                    scheduledAt: { gte: new Date() }
                },
                orderBy: { scheduledAt: 'asc' }
            });

            if (!appointment) {
                return {
                    success: false,
                    mensagem: 'Não encontrei nenhum agendamento futuro confirmado para cancelar.'
                };
            }


            const cancelledReminders = await this.prisma.appointmentReminder.updateMany({
                where: {
                    appointmentId: appointment.id,
                    status: 'PENDING'
                },
                data: {
                    status: 'CANCELLED'
                }
            });
            console.log(`[Scheduling Tools] ♻️ Cancelled ${cancelledReminders.count} pending reminders`);

            await this.schedulingService.cancelAppointment(appointment.id);

            return {
                success: true,
                agendamento: appointment,
                mensagem: `✅ Agendamento do dia ${appointment.scheduledAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${appointment.scheduledAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })} foi cancelado com sucesso.`
            };

        } catch (error: any) {
            console.error('[Scheduling Tools] Erro ao cancelar agendamento:', error);
            return {
                success: false,
                mensagem: 'Ocorreu um erro técnico ao tentar cancelar o agendamento.'
            };
        }
    }


    async reagendarUltimoAgendamento(params: {
        organizationId: string;
        leadId: string;
        data_especifica?: string;
        horario_especifico?: string;
    }) {
        try {
            if (!params.data_especifica || !params.horario_especifico) {
                return {
                    success: false,
                    mensagem: 'Preciso da nova data e horário para reagendar.'
                };
            }

            console.log('[Scheduling Tools] 🔍 reagendarUltimoAgendamento - searching for existing appointment:', {
                leadId: params.leadId,
                organizationId: params.organizationId,
                now: new Date().toISOString()
            });

            // First, let's see ALL appointments for this lead (for debugging)
            const allAppointments = await this.prisma.appointment.findMany({
                where: {
                    leadId: params.leadId,
                    organizationId: params.organizationId,
                },
                select: { id: true, status: true, scheduledAt: true }
            });
            console.log('[Scheduling Tools] 🔍 All appointments for this lead:', allAppointments);

            const appointment = await this.prisma.appointment.findFirst({
                where: {
                    leadId: params.leadId,
                    organizationId: params.organizationId,
                    status: 'SCHEDULED',
                    scheduledAt: { gte: new Date() }
                },
                orderBy: { scheduledAt: 'asc' }
            });

            console.log('[Scheduling Tools] 🔍 Found scheduled appointment:', appointment ? appointment.id : 'NONE');

            // If no existing appointment, create a new one instead
            if (!appointment) {
                console.log('[Scheduling Tools] No existing appointment found for reschedule, creating new one...');
                return await this.confirmarAgendamento({
                    organizationId: params.organizationId,
                    leadId: params.leadId,
                    data_especifica: params.data_especifica,
                    horario_especifico: params.horario_especifico,
                });
            }

            console.log('[Scheduling Tools] Found existing appointment to reschedule:', appointment.id, 'scheduled for:', appointment.scheduledAt);

            // IMPORTANT: Cancel the old appointment FIRST, then create the new one
            // This prevents the old appointment from blocking the new slot

            // Cancel pending reminders for the old appointment
            const cancelledReminders = await this.prisma.appointmentReminder.updateMany({
                where: {
                    appointmentId: appointment.id,
                    status: 'PENDING'
                },
                data: {
                    status: 'CANCELLED'
                }
            });
            console.log(`[Scheduling Tools] ♻️ Cancelled ${cancelledReminders.count} pending reminders for old appointment`);

            // Delete the old appointment (including Google Calendar if configured)
            try {
                console.log('[Scheduling Tools] 🗑️ Deleting old appointment:', appointment.id);
                await this.schedulingService.cancelAppointment(appointment.id);
                console.log('[Scheduling Tools] ✅ Old appointment deleted successfully:', appointment.id);

                // Verify the deletion
                const verifyAppointment = await this.prisma.appointment.findUnique({
                    where: { id: appointment.id },
                    select: { id: true }
                });
                console.log('[Scheduling Tools] 🔍 Verification - Old appointment exists:', !!verifyAppointment);
            } catch (deleteError) {
                console.error('[Scheduling Tools] ❌ Error deleting old appointment:', deleteError);
            }

            // Now check availability (without the old appointment blocking)
            const check = await this.verificarDisponibilidade({
                organizationId: params.organizationId,
                leadId: params.leadId,
                data_especifica: params.data_especifica,
                horario_especifico: params.horario_especifico
            });

            if (!check.disponivel) {
                return {
                    success: false,
                    mensagem: `O novo horário (${params.data_especifica} às ${params.horario_especifico}) não está disponível. O agendamento anterior foi cancelado. Por favor, escolha outro horário.`
                };
            }

            // Create the new appointment
            const result = await this.confirmarAgendamento({
                organizationId: params.organizationId,
                leadId: params.leadId,
                data_especifica: params.data_especifica,
                horario_especifico: params.horario_especifico,
            });

            if (result.success) {
                const [hours, minutes] = params.horario_especifico.split(':').map(Number);
                const [year, month, day] = params.data_especifica.split('-').map(Number);
                const novaData = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0, 0));

                return {
                    success: true,
                    agendamento: result.agendamento,
                    mensagem: `✅ Agendamento reagendado com sucesso para ${novaData.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} às ${novaData.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}!`
                };
            }

            return result;

        } catch (error: any) {
            console.error('[Scheduling Tools] Erro ao reagendar:', error);
            return {
                success: false,
                mensagem: 'Erro ao tentar reagendar o compromisso.'
            };
        }
    }
}
