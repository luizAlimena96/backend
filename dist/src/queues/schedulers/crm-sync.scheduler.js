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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CRMSyncScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMSyncScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const prisma_service_1 = require("../../database/prisma.service");
const crm_sync_job_1 = require("../jobs/crm-sync.job");
let CRMSyncScheduler = CRMSyncScheduler_1 = class CRMSyncScheduler {
    crmSyncQueue;
    prisma;
    logger = new common_1.Logger(CRMSyncScheduler_1.name);
    constructor(crmSyncQueue, prisma) {
        this.crmSyncQueue = crmSyncQueue;
        this.prisma = prisma;
    }
    async handleCRMSync() {
        this.logger.log('🔄 Iniciando sincronização CRM → Calendar');
        try {
            const orgs = await this.prisma.organization.findMany({
                where: { crmCalendarSyncEnabled: true },
                select: { id: true, name: true },
            });
            this.logger.log(`Encontradas ${orgs.length} organizações com sync habilitado`);
            for (const org of orgs) {
                await this.crmSyncQueue.add(crm_sync_job_1.CRM_SYNC_JOBS.SYNC, {
                    organizationId: org.id,
                    type: 'sync',
                }, {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 5000,
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50,
                });
                this.logger.log(`✅ Job de sync adicionado para: ${org.name}`);
            }
            this.logger.log('✅ Sincronização agendada para todas as organizações');
        }
        catch (error) {
            this.logger.error('❌ Erro ao agendar sincronização:', error);
        }
    }
    async handleCRMCleanup() {
        this.logger.log('🧹 Iniciando limpeza de eventos antigos');
        try {
            const orgs = await this.prisma.organization.findMany({
                where: { crmCalendarSyncEnabled: true },
                select: { id: true, name: true },
            });
            for (const org of orgs) {
                await this.crmSyncQueue.add(crm_sync_job_1.CRM_SYNC_JOBS.CLEANUP, {
                    organizationId: org.id,
                    type: 'cleanup',
                }, {
                    attempts: 2,
                    removeOnComplete: true,
                });
                this.logger.log(`✅ Job de limpeza adicionado para: ${org.name}`);
            }
            this.logger.log('✅ Limpeza agendada para todas as organizações');
        }
        catch (error) {
            this.logger.error('❌ Erro ao agendar limpeza:', error);
        }
    }
};
exports.CRMSyncScheduler = CRMSyncScheduler;
__decorate([
    (0, schedule_1.Cron)('*/15 * * * *', {
        name: 'crm-calendar-sync',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CRMSyncScheduler.prototype, "handleCRMSync", null);
__decorate([
    (0, schedule_1.Cron)('0 3 * * *', {
        name: 'crm-cleanup',
        timeZone: 'America/Sao_Paulo',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CRMSyncScheduler.prototype, "handleCRMCleanup", null);
exports.CRMSyncScheduler = CRMSyncScheduler = CRMSyncScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(crm_sync_job_1.CRM_SYNC_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        prisma_service_1.PrismaService])
], CRMSyncScheduler);
//# sourceMappingURL=crm-sync.scheduler.js.map