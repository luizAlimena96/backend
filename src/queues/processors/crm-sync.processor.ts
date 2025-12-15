import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../database/prisma.service';
import { CRM_SYNC_QUEUE, CRM_SYNC_JOBS, CRMSyncJob } from '../jobs/crm-sync.job';

interface CRMEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    duration: number;
    description?: string;
}

@Processor(CRM_SYNC_QUEUE)
@Injectable()
export class CRMSyncProcessor extends WorkerHost {
    private readonly logger = new Logger(CRMSyncProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
    ) {
        super();
    }

    async process(job: Job<CRMSyncJob>): Promise<void> {
        const { organizationId, type } = job.data;

        this.logger.log(`Processing ${type} for organization: ${organizationId}`);

        try {
            if (type === 'sync') {
                await this.syncCRMCalendar(organizationId);
            } else if (type === 'cleanup') {
                await this.cleanupOldCRMEvents(organizationId);
            }

            this.logger.log(`✅ ${type} completed for organization: ${organizationId}`);
        } catch (error) {
            this.logger.error(`❌ ${type} failed for organization: ${organizationId}`, error);
            throw error; // BullMQ will retry
        }
    }

    private async syncCRMCalendar(organizationId: string): Promise<void> {
        const org = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            include: { agents: true },
        });

        if (!org?.crmCalendarSyncEnabled || !org.crmCalendarApiUrl) {
            this.logger.log(`Org ${org?.name} não tem sync habilitado`);
            return;
        }

        this.logger.log(`Iniciando sincronização para ${org.name}`);

        try {
            // 1. Buscar eventos do CRM
            const crmEvents = await this.fetchCRMEvents(org);
            this.logger.log(`Encontrados ${crmEvents.length} eventos no CRM`);

            // 2. Sincronizar eventos
            for (const event of crmEvents) {
                // Verificar se já existe
                const existing = await this.prisma.appointment.findFirst({
                    where: {
                        crmEventId: event.id,
                        organizationId,
                    },
                });

                if (existing) {
                    this.logger.debug(`Evento ${event.id} já existe, pulando`);
                    continue;
                }

                // 3. Marcar como bloqueado no sistema
                await this.prisma.appointment.create({
                    data: {
                        title: `[CRM] ${event.title}`,
                        scheduledAt: event.start,
                        duration: event.duration,
                        type: 'CRM_SYNC',
                        status: 'CRM_BLOCKED',
                        source: 'CRM_SYNC',
                        crmEventId: event.id,
                        crmSynced: true,
                        organizationId,
                        notes: event.description,
                    },
                });

                this.logger.log(`✅ Evento ${event.id} sincronizado`);
            }

            this.logger.log(`✅ Sincronização completa para ${org.name}`);
        } catch (error) {
            this.logger.error(`❌ Erro na sincronização:`, error);
            throw error;
        }
    }

    private async fetchCRMEvents(org: any): Promise<CRMEvent[]> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (org.crmCalendarApiKey) {
            headers['Authorization'] = `Bearer ${org.crmCalendarApiKey}`;
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get(org.crmCalendarApiUrl, { headers }),
            );

            return this.normalizeCRMEvents(response.data, org.crmCalendarType);
        } catch (error) {
            this.logger.error('Erro ao buscar eventos do CRM:', error);
            throw error;
        }
    }

    private normalizeCRMEvents(data: any, crmType?: string): CRMEvent[] {
        if (!data) return [];

        // DataCrazy format
        if (crmType === 'datacrazy') {
            return (data.events || []).map((e: any) => ({
                id: e.id || e.event_id,
                title: e.title || e.name || 'Evento CRM',
                start: new Date(e.start_time || e.start),
                end: new Date(e.end_time || e.end),
                duration: this.calculateDuration(e.start_time || e.start, e.end_time || e.end),
                description: e.description || e.notes,
            }));
        }

        // RD Station format
        if (crmType === 'rdstation') {
            return (data.appointments || []).map((e: any) => ({
                id: e.uuid || e.id,
                title: e.title || 'Reunião',
                start: new Date(e.scheduled_to),
                end: new Date(e.scheduled_to_end || this.addMinutes(e.scheduled_to, 60)),
                duration: e.duration || 60,
                description: e.notes,
            }));
        }

        // Custom/Generic format
        return (data.events || data.appointments || data).map((e: any) => ({
            id: e.id || e.event_id || String(Math.random()),
            title: e.title || e.summary || e.name || 'Evento',
            start: new Date(e.start || e.start_time || e.scheduledAt),
            end: new Date(e.end || e.end_time || e.scheduledEnd || this.addMinutes(e.start, 60)),
            duration: e.duration || this.calculateDuration(e.start, e.end) || 60,
            description: e.description || e.notes || e.details,
        }));
    }

    private calculateDuration(start: string | Date, end: string | Date): number {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
    }

    private addMinutes(dateStr: string, minutes: number): string {
        const date = new Date(dateStr);
        date.setMinutes(date.getMinutes() + minutes);
        return date.toISOString();
    }

    private async cleanupOldCRMEvents(organizationId: string): Promise<number> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const result = await this.prisma.appointment.deleteMany({
            where: {
                organizationId,
                source: 'CRM_SYNC',
                scheduledAt: {
                    lt: thirtyDaysAgo,
                },
            },
        });

        this.logger.log(`Cleaned up ${result.count} old events`);
        return result.count;
    }
}
