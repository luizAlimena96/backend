import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { CRM_SYNC_QUEUE, CRM_SYNC_JOBS } from '../jobs/crm-sync.job';

@Injectable()
export class CRMSyncScheduler {
    private readonly logger = new Logger(CRMSyncScheduler.name);

    constructor(
        @InjectQueue(CRM_SYNC_QUEUE) private crmSyncQueue: Queue,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Sincronização CRM → Calendar
     * Executa a cada 15 minutos
     */
    @Cron('*/15 * * * *', {
        name: 'crm-calendar-sync',
        timeZone: 'America/Sao_Paulo',
    })
    async handleCRMSync() {
        this.logger.log('🔄 Iniciando sincronização CRM → Calendar');

        try {
            const orgs = await this.prisma.organization.findMany({
                where: { crmCalendarSyncEnabled: true },
                select: { id: true, name: true },
            });

            this.logger.log(`Encontradas ${orgs.length} organizações com sync habilitado`);

            for (const org of orgs) {
                await this.crmSyncQueue.add(
                    CRM_SYNC_JOBS.SYNC,
                    {
                        organizationId: org.id,
                        type: 'sync',
                    },
                    {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 5000,
                        },
                        removeOnComplete: 100,
                        removeOnFail: 50,
                    },
                );

                this.logger.log(`✅ Job de sync adicionado para: ${org.name}`);
            }

            this.logger.log('✅ Sincronização agendada para todas as organizações');
        } catch (error) {
            this.logger.error('❌ Erro ao agendar sincronização:', error);
        }
    }

    /**
     * Limpeza de eventos antigos
     * Executa diariamente às 3h da manhã
     */
    @Cron('0 3 * * *', {
        name: 'crm-cleanup',
        timeZone: 'America/Sao_Paulo',
    })
    async handleCRMCleanup() {
        this.logger.log('🧹 Iniciando limpeza de eventos antigos');

        try {
            const orgs = await this.prisma.organization.findMany({
                where: { crmCalendarSyncEnabled: true },
                select: { id: true, name: true },
            });

            for (const org of orgs) {
                await this.crmSyncQueue.add(
                    CRM_SYNC_JOBS.CLEANUP,
                    {
                        organizationId: org.id,
                        type: 'cleanup',
                    },
                    {
                        attempts: 2,
                        removeOnComplete: true,
                    },
                );

                this.logger.log(`✅ Job de limpeza adicionado para: ${org.name}`);
            }

            this.logger.log('✅ Limpeza agendada para todas as organizações');
        } catch (error) {
            this.logger.error('❌ Erro ao agendar limpeza:', error);
        }
    }
}
