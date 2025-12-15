import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FollowupJobService } from './jobs/followup.job';
import { ReminderJobService } from './jobs/reminder.job';
import { CRMSyncJobService } from './jobs/crm-sync.job';
import { FollowupProcessor } from './processors/followup.processor';
import { ReminderProcessor } from './processors/reminder.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AutomationProcessor } from './processors/automation.processor';
import { CRMSyncProcessor } from './processors/crm-sync.processor';
import { CRMSyncScheduler } from './schedulers/crm-sync.scheduler';
import { PrismaModule } from '../database/prisma.module';

@Module({
    imports: [
        ConfigModule,
        PrismaModule,
        HttpModule,
        BullModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                return {
                    connection: {
                        // ============================================
                        // CONEXÃO EXPLÍCITA - LOCALHOST APENAS
                        // ============================================
                        host: configService.get('REDIS_HOST', '127.0.0.1'),
                        port: parseInt(configService.get('REDIS_PORT', '6379'), 10),
                        password: configService.get('REDIS_PASSWORD'),
                        db: parseInt(configService.get('REDIS_DB', '0'), 10),

                        // ============================================
                        // RETRY STRATEGY - LIMITADO PARA VM
                        // ============================================
                        maxRetriesPerRequest: null,
                        // MUST be null for BullMQ (manages retries internally)

                        retryStrategy: (times: number) => {
                            const maxRetries = parseInt(configService.get('BULLMQ_MAX_RETRIES', '3'), 10);
                            if (times > maxRetries) {
                                console.error(`[BullMQ] ❌ Max retries (${maxRetries}) reached. Stopping.`);
                                return null;
                            }
                            // Delay progressivo: 1s, 2s, 3s (alinhado com redis.config.ts)
                            const delay = Math.min(times * 1000, 3000);
                            console.warn(`[BullMQ] Retry ${times}/${maxRetries} in ${delay}ms`);
                            return delay;
                        },

                        // ============================================
                        // TIMEOUTS - FALHA RÁPIDO (alinhado com redis.config.ts)
                        // ============================================
                        connectTimeout: parseInt(configService.get('BULLMQ_CONNECTION_TIMEOUT', '10000'), 10),
                        commandTimeout: parseInt(configService.get('BULLMQ_COMMAND_TIMEOUT', '30000'), 10),

                        // ============================================
                        // SEGURANÇA
                        // ============================================
                        enableOfflineQueue: false,
                        // CRÍTICO: Não enfileirar comandos offline

                        enableReadyCheck: true,
                        // Verifica se Redis está pronto antes de usar

                        lazyConnect: false,
                        // Conectar imediatamente (não lazy)

                        family: 4,
                        // IPv4 apenas (evita auto-discovery IPv6)

                        keepAlive: 30000,
                        // Keep-alive a cada 30s
                    },
                };
            },
            inject: [ConfigService],
        }),
        BullModule.registerQueue(
            { name: 'followup' },
            { name: 'reminder' },
            { name: 'notification' },
            { name: 'automation' },
            { name: 'crm-sync' },
        ),
    ],
    providers: [
        // Job Services
        FollowupJobService,
        ReminderJobService,
        CRMSyncJobService,

        // Processors
        FollowupProcessor,
        ReminderProcessor,
        NotificationProcessor,
        AutomationProcessor,
        CRMSyncProcessor,

        // Schedulers
        CRMSyncScheduler,
    ],
    exports: [
        FollowupJobService,
        ReminderJobService,
        CRMSyncJobService,
    ],
})
export class QueuesModule { }
