"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMSyncJobService = exports.CRM_SYNC_JOBS = exports.CRM_SYNC_QUEUE = void 0;
const common_1 = require("@nestjs/common");
exports.CRM_SYNC_QUEUE = 'crm-sync';
exports.CRM_SYNC_JOBS = {
    SYNC: 'crm-sync',
    CLEANUP: 'crm-cleanup',
};
let CRMSyncJobService = class CRMSyncJobService {
    async createSyncJob(organizationId) {
        console.log('[CRM Sync Job] Created sync job for org:', organizationId);
    }
    async createCleanupJob(organizationId) {
        console.log('[CRM Sync Job] Created cleanup job for org:', organizationId);
    }
};
exports.CRMSyncJobService = CRMSyncJobService;
exports.CRMSyncJobService = CRMSyncJobService = __decorate([
    (0, common_1.Injectable)()
], CRMSyncJobService);
//# sourceMappingURL=crm-sync.job.js.map