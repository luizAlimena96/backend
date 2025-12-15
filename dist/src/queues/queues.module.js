"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueuesModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const followup_job_1 = require("./jobs/followup.job");
const reminder_job_1 = require("./jobs/reminder.job");
const crm_sync_job_1 = require("./jobs/crm-sync.job");
const followup_processor_1 = require("./processors/followup.processor");
const reminder_processor_1 = require("./processors/reminder.processor");
const notification_processor_1 = require("./processors/notification.processor");
const automation_processor_1 = require("./processors/automation.processor");
const crm_sync_processor_1 = require("./processors/crm-sync.processor");
const crm_sync_scheduler_1 = require("./schedulers/crm-sync.scheduler");
const prisma_module_1 = require("../database/prisma.module");
let QueuesModule = class QueuesModule {
};
exports.QueuesModule = QueuesModule;
exports.QueuesModule = QueuesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            axios_1.HttpModule,
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    return {
                        connection: {
                            host: configService.get('REDIS_HOST', '127.0.0.1'),
                            port: parseInt(configService.get('REDIS_PORT', '6379'), 10),
                            password: configService.get('REDIS_PASSWORD'),
                            db: parseInt(configService.get('REDIS_DB', '0'), 10),
                            maxRetriesPerRequest: null,
                            retryStrategy: (times) => {
                                const maxRetries = parseInt(configService.get('BULLMQ_MAX_RETRIES', '3'), 10);
                                if (times > maxRetries) {
                                    console.error(`[BullMQ] ❌ Max retries (${maxRetries}) reached. Stopping.`);
                                    return null;
                                }
                                const delay = Math.min(times * 1000, 3000);
                                console.warn(`[BullMQ] Retry ${times}/${maxRetries} in ${delay}ms`);
                                return delay;
                            },
                            connectTimeout: parseInt(configService.get('BULLMQ_CONNECTION_TIMEOUT', '10000'), 10),
                            commandTimeout: parseInt(configService.get('BULLMQ_COMMAND_TIMEOUT', '30000'), 10),
                            enableOfflineQueue: false,
                            enableReadyCheck: true,
                            lazyConnect: false,
                            family: 4,
                            keepAlive: 30000,
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            bullmq_1.BullModule.registerQueue({ name: 'followup' }, { name: 'reminder' }, { name: 'notification' }, { name: 'automation' }, { name: 'crm-sync' }),
        ],
        providers: [
            followup_job_1.FollowupJobService,
            reminder_job_1.ReminderJobService,
            crm_sync_job_1.CRMSyncJobService,
            followup_processor_1.FollowupProcessor,
            reminder_processor_1.ReminderProcessor,
            notification_processor_1.NotificationProcessor,
            automation_processor_1.AutomationProcessor,
            crm_sync_processor_1.CRMSyncProcessor,
            crm_sync_scheduler_1.CRMSyncScheduler,
        ],
        exports: [
            followup_job_1.FollowupJobService,
            reminder_job_1.ReminderJobService,
            crm_sync_job_1.CRMSyncJobService,
        ],
    })
], QueuesModule);
//# sourceMappingURL=queues.module.js.map