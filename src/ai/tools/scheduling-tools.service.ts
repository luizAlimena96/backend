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
     * Ferramenta unificada de agendamento
     * Ações: sugerir_iniciais, verificar_disponibilidade, confirmar
     */
    async gerenciarAgenda(
        acao: 'sugerir_iniciais' | 'verificar_disponibilidade' | 'confirmar',
        params: {
            organizationId: string;
            leadId: string;
            periodo_dia?: 'manha' | 'tarde' | 'noite';
            data_especifica?: string; // YYYY-MM-DD
            horario_especifico?: string; // HH:MM
            horarios_ja_oferecidos?: string[]; // Para evitar repetição
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

            default:
                return {
                    success: false,
                    mensagem: `Ação '${acao}' não reconhecida.`
                };
        }
    }

    /**
     * Sugere 2 horários iniciais baseado no período do dia (ou padrão)
     */
    private async sugerirHorariosIniciais(params: {
        organizationId: string;
        leadId: string;
        periodo_dia?: 'manha' | 'tarde' | 'noite';
        horarios_ja_oferecidos?: string[];
    }) {
        try {
            // 1. Buscar configuração de agendamento do lead
            // Usando relação direta com agent conforme schema
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

            // 2. Calcular data mínima (antecedência)
            const now = new Date();
            const minAdvanceMs = config.minAdvanceHours * 60 * 60 * 1000;
            const minDate = new Date(now.getTime() + minAdvanceMs);

            // 3. Buscar slots nos próximos 14 dias
            const horariosSugeridos: Array<{ dia: string; horario: string; data_completa: Date }> = [];
            const maxDias = 14;

            for (let i = 0; i < maxDias && horariosSugeridos.length < 2; i++) {
                const checkDate = new Date(minDate);
                checkDate.setDate(checkDate.getDate() + i);

                const slots = await this.schedulingService.getAvailableSlots(
                    params.organizationId,
                    checkDate
                );

                // Filtrar por período do dia se especificado
                const slotsFiltrados = this.filtrarPorPeriodo(slots, params.periodo_dia);

                // Filtrar horários já oferecidos
                const slotsNovos = slotsFiltrados.filter(slot => {
                    const horarioStr = `${slot.time.toLocaleDateString('pt-BR')} ${slot.time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                    return !params.horarios_ja_oferecidos?.includes(horarioStr);
                });

                // Adicionar até 2 horários
                for (const slot of slotsNovos) {
                    if (horariosSugeridos.length >= 2) break;

                    horariosSugeridos.push({
                        dia: slot.time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
                        horario: slot.time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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

            // Se encontrou apenas 1, buscar mais um em outro dia
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

    /**
     * Verifica se um horário específico está disponível
     */
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

            const slots = await this.schedulingService.getAvailableSlots(
                params.organizationId,
                dataHora
            );

            const disponivel = slots.some(slot =>
                Math.abs(slot.time.getTime() - dataHora.getTime()) < 60000 // Dentro de 1 minuto
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

    /**
     * Confirma e cria o agendamento
     */
    private async confirmarAgendamento(params: {
        organizationId: string;
        leadId: string;
        data_especifica?: string;
        horario_especifico?: string;
    }) {
        try {
            if (!params.data_especifica || !params.horario_especifico) {
                return {
                    success: false,
                    mensagem: 'Data e horário são obrigatórios para confirmar o agendamento.'
                };
            }

            const lead = await this.prisma.lead.findUnique({
                where: { id: params.leadId },
                include: { agent: true }
            });

            if (!lead?.agent) {
                return {
                    success: false,
                    mensagem: 'Agente não encontrado.'
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

            const [hours, minutes] = params.horario_especifico.split(':').map(Number);
            const scheduledAt = new Date(params.data_especifica);
            scheduledAt.setHours(hours, minutes, 0, 0);

            const appointment = await this.schedulingService.createAppointment({
                leadId: params.leadId,
                title: `Reunião com ${lead.name}`,
                scheduledAt,
                duration: config?.duration || 60,
                type: 'MEETING',
                organizationId: params.organizationId,
            });

            return {
                success: true,
                agendamento: appointment,
                mensagem: `✅ Agendamento confirmado para ${scheduledAt.toLocaleDateString('pt-BR')} às ${scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}!`
            };

        } catch (error: any) {
            console.error('[Scheduling Tools] Erro ao confirmar agendamento:', error);
            return {
                success: false,
                mensagem: 'Erro ao criar agendamento.'
            };
        }
    }

    /**
     * Filtra slots por período do dia
     */
    private filtrarPorPeriodo(
        slots: Array<{ time: Date; available: boolean }>,
        periodo?: 'manha' | 'tarde' | 'noite'
    ) {
        if (!periodo) return slots;

        return slots.filter(slot => {
            const hour = slot.time.getHours();

            switch (periodo) {
                case 'manha':
                    return hour >= 6 && hour < 12;
                case 'tarde':
                    return hour >= 12 && hour < 18;
                case 'noite':
                    return hour >= 18 && hour < 22;
                default:
                    return true;
            }
        });
    }

    /**
     * Busca o próximo agendamento futuro do lead e o cancela
     */
    async cancelarUltimoAgendamento(params: {
        organizationId: string;
        leadId: string;
    }) {
        try {
            // 1. Buscar agendamento futuro mais próximo
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

            // 2. Cancelar
            await this.schedulingService.cancelAppointment(appointment.id);

            return {
                success: true,
                agendamento: appointment,
                mensagem: `O agendamento do dia ${appointment.scheduledAt.toLocaleDateString('pt-BR')} às ${appointment.scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} foi cancelado com sucesso.`
            };

        } catch (error: any) {
            console.error('[Scheduling Tools] Erro ao cancelar agendamento:', error);
            return {
                success: false,
                mensagem: 'Ocorreu um erro técnico ao tentar cancelar o agendamento.'
            };
        }
    }

    /**
     * Reagenda o próximo compromisso para uma nova data/horário
     */
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

            // 1. Buscar agendamento futuro mais próximo
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
                    mensagem: 'Não encontrei nenhum agendamento futuro para reagendar.'
                };
            }

            // 2. Verificar disponibilidade do novo horário
            const [hours, minutes] = params.horario_especifico.split(':').map(Number);
            const novaData = new Date(params.data_especifica);
            novaData.setHours(hours, minutes, 0, 0);

            const check = await this.verificarDisponibilidade({
                organizationId: params.organizationId,
                leadId: params.leadId,
                data_especifica: params.data_especifica,
                horario_especifico: params.horario_especifico
            });

            if (!check.disponivel) {
                return {
                    success: false,
                    mensagem: `O novo horário (${params.data_especifica} às ${params.horario_especifico}) não está disponível. Por favor, escolha outro.`
                };
            }

            // 3. Reagendar
            await this.schedulingService.rescheduleAppointment(appointment.id, novaData);

            return {
                success: true,
                agendamento: appointment,
                mensagem: `Agendamento reagendado com sucesso para ${novaData.toLocaleDateString('pt-BR')} às ${novaData.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
            };

        } catch (error: any) {
            console.error('[Scheduling Tools] Erro ao reagendar:', error);
            return {
                success: false,
                mensagem: 'Erro ao tentar reagendar o compromisso.'
            };
        }
    }
}
