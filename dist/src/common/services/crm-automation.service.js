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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMAutomationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const zapsign_service_1 = require("../../integrations/zapsign/zapsign.service");
let CRMAutomationService = class CRMAutomationService {
    prisma;
    zapSignService;
    constructor(prisma, zapSignService) {
        this.prisma = prisma;
        this.zapSignService = zapSignService;
    }
    async executeAutomationsForState(leadId, stageId) {
        console.log(`[CRM Automation] Checking automations for lead ${leadId} in stage ${stageId}`);
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    agent: {
                        include: {
                            organization: true
                        }
                    }
                }
            });
            if (!lead || !lead.agent) {
                console.log('[CRM Automation] Lead or Agent not found');
                return;
            }
            if (lead.agent.zapSignTriggerCrmStageId === stageId) {
                await this.handleZapSignTrigger(lead, stageId);
            }
        }
        catch (error) {
            console.error('[CRM Automation] Error executing automations:', error);
        }
    }
    async handleZapSignTrigger(lead, stageId) {
        console.log('[CRM Automation] Triggering ZapSign flow for lead:', lead.id);
        const agent = lead.agent;
        const org = agent.organization;
        if (!org.zapSignApiToken || !org.zapSignTemplateId) {
            console.error('[CRM Automation] ZapSign not configured for organization');
            return;
        }
        const mapping = agent.zapSignFieldMapping;
        if (!mapping || mapping.length === 0) {
            console.error('[CRM Automation] No ZapSign field mapping for agent');
            return;
        }
        const signersData = {
            name: lead.name || 'Sem Nome',
            email: lead.email || '',
        };
        const customData = mapping.map(m => {
            const value = this.resolveValue(m.leadField, lead);
            return {
                variable: m.templateField.replace('{{ $json.', '').replace(' }}', '').trim(),
                value: value
            };
        });
        const payload = {
            signers: [{
                    name: lead.name,
                    email: lead.email,
                    send_automatic_email: false,
                    send_automatic_whatsapp: false
                }],
            data: customData.map(d => ({
                de: d.variable,
                para: d.value
            }))
        };
        try {
            const doc = await this.zapSignService.createDocument(org.zapSignApiToken, org.zapSignTemplateId, payload);
            console.log('[CRM Automation] ZapSign document created:', doc.uuid);
        }
        catch (err) {
            console.error('[CRM Automation] Failed to create ZapSign doc:', err);
        }
    }
    resolveValue(path, context) {
        try {
            const cleanPath = path.replace(/{{|}}/g, '').trim();
            if (cleanPath === 'currentDate')
                return new Date().toLocaleDateString('pt-BR');
            if (cleanPath === 'lead.name')
                return context.name || '';
            if (cleanPath === 'lead.email')
                return context.email || '';
            if (cleanPath === 'lead.phone')
                return context.phone || '';
            if (cleanPath === 'lead.cpf')
                return context.cpf || '';
            if (cleanPath === 'lead.rg')
                return context.rg || '';
            if (cleanPath.startsWith('lead.extractedData.')) {
                const field = cleanPath.split('lead.extractedData.')[1];
                return context.extractedData?.[field] || '';
            }
            return '';
        }
        catch (e) {
            return '';
        }
    }
    async createAutomation(data) {
        console.log('[CRM Automation] Would create automation:', data.name);
        return { id: 'placeholder', ...data };
    }
};
exports.CRMAutomationService = CRMAutomationService;
exports.CRMAutomationService = CRMAutomationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        zapsign_service_1.ZapSignService])
], CRMAutomationService);
//# sourceMappingURL=crm-automation.service.js.map