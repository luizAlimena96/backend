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
var CRMSyncProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMSyncProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const prisma_service_1 = require("../../database/prisma.service");
const crm_sync_job_1 = require("../jobs/crm-sync.job");
let CRMSyncProcessor = CRMSyncProcessor_1 = class CRMSyncProcessor extends bullmq_1.WorkerHost {
    prisma;
    httpService;
    logger = new common_1.Logger(CRMSyncProcessor_1.name);
    constructor(prisma, httpService) {
        super();
        this.prisma = prisma;
        this.httpService = httpService;
    }
    async process(job) {
        const { organizationId, type } = job.data;
        this.logger.log(`Processing ${type} for organization: ${organizationId}`);
        try {
            if (type === 'sync') {
                await this.syncCRMCalendar(organizationId);
            }
            else if (type === 'cleanup') {
                await this.cleanupOldCRMEvents(organizationId);
            }
            this.logger.log(`✅ ${type} completed for organization: ${organizationId}`);
        }
        catch (error) {
            this.logger.error(`❌ ${type} failed for organization: ${organizationId}`, error);
            throw error;
        }
    }
    async syncCRMCalendar(organizationId) {
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
            const crmEvents = await this.fetchCRMEvents(org);
            this.logger.log(`Encontrados ${crmEvents.length} eventos no CRM`);
            for (const event of crmEvents) {
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
        }
        catch (error) {
            this.logger.error(`❌ Erro na sincronização:`, error);
            throw error;
        }
    }
    async fetchCRMEvents(org) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (org.crmCalendarApiKey) {
            headers['Authorization'] = `Bearer ${org.crmCalendarApiKey}`;
        }
        try {
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.get(org.crmCalendarApiUrl, { headers }));
            return this.normalizeCRMEvents(response.data, org.crmCalendarType);
        }
        catch (error) {
            this.logger.error('Erro ao buscar eventos do CRM:', error);
            throw error;
        }
    }
    normalizeCRMEvents(data, crmType) {
        if (!data)
            return [];
        if (crmType === 'datacrazy') {
            return (data.events || []).map((e) => ({
                id: e.id || e.event_id,
                title: e.title || e.name || 'Evento CRM',
                start: new Date(e.start_time || e.start),
                end: new Date(e.end_time || e.end),
                duration: this.calculateDuration(e.start_time || e.start, e.end_time || e.end),
                description: e.description || e.notes,
            }));
        }
        if (crmType === 'rdstation') {
            return (data.appointments || []).map((e) => ({
                id: e.uuid || e.id,
                title: e.title || 'Reunião',
                start: new Date(e.scheduled_to),
                end: new Date(e.scheduled_to_end || this.addMinutes(e.scheduled_to, 60)),
                duration: e.duration || 60,
                description: e.notes,
            }));
        }
        return (data.events || data.appointments || data).map((e) => ({
            id: e.id || e.event_id || String(Math.random()),
            title: e.title || e.summary || e.name || 'Evento',
            start: new Date(e.start || e.start_time || e.scheduledAt),
            end: new Date(e.end || e.end_time || e.scheduledEnd || this.addMinutes(e.start, 60)),
            duration: e.duration || this.calculateDuration(e.start, e.end) || 60,
            description: e.description || e.notes || e.details,
        }));
    }
    calculateDuration(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        return Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
    }
    addMinutes(dateStr, minutes) {
        const date = new Date(dateStr);
        date.setMinutes(date.getMinutes() + minutes);
        return date.toISOString();
    }
    async cleanupOldCRMEvents(organizationId) {
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
};
exports.CRMSyncProcessor = CRMSyncProcessor;
exports.CRMSyncProcessor = CRMSyncProcessor = CRMSyncProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(crm_sync_job_1.CRM_SYNC_QUEUE),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        axios_1.HttpService])
], CRMSyncProcessor);
//# sourceMappingURL=crm-sync.processor.js.map