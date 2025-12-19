"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMAutomationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const zapsign_service_1 = require("../../integrations/zapsign/zapsign.service");
const scheduling_tools_service_1 = require("../../ai/tools/scheduling-tools.service");
const whatsapp_integration_service_1 = require("../../integrations/whatsapp/whatsapp-integration.service");
const openai_service_1 = require("../../ai/services/openai.service");
const crypto = __importStar(require("crypto"));
let CRMAutomationService = class CRMAutomationService {
    prisma;
    zapSignService;
    schedulingToolsService;
    whatsappService;
    openaiService;
    constructor(prisma, zapSignService, schedulingToolsService, whatsappService, openaiService) {
        this.prisma = prisma;
        this.zapSignService = zapSignService;
        this.schedulingToolsService = schedulingToolsService;
        this.whatsappService = whatsappService;
        this.openaiService = openaiService;
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
            await this.handleAutoScheduling(lead, stageId);
        }
        catch (error) {
            console.error('[CRM Automation] Error executing automations:', error);
        }
    }
    async handleAutoScheduling(lead, stageId) {
        try {
            const config = await this.prisma.autoSchedulingConfig.findFirst({
                where: {
                    agentId: lead.agentId,
                    crmStageId: stageId,
                    isActive: true
                }
            });
            if (!config)
                return;
            console.log(`[CRM Automation] Auto Scheduling triggered for lead ${lead.id}`);
            const extractedData = lead.extractedData || {};
            const periodoDia = extractedData.periodo_dia || undefined;
            const slotsResult = await this.schedulingToolsService.gerenciarAgenda('sugerir_iniciais', {
                organizationId: lead.organizationId,
                leadId: lead.id,
                periodo_dia: periodoDia
            });
            if (!slotsResult.success || !slotsResult.horarios) {
                console.log('[CRM Automation] No slots available to offer.');
                return;
            }
            const slotsText = slotsResult.horarios.map(h => `- ${h.dia} às ${h.horario}`).join('\n');
            const systemPrompt = `Você é ${lead.agent.name}.
O lead ${lead.name} acabou de entrar na etapa de Agendamento.
Sua tarefa é convidar o lead para uma reunião, oferecendo os seguintes horários disponíveis:

${slotsText}

Use este modelo de mensagem configurado pelo usuário como BASE (adapte para soar natural):
"${config.messageTemplate || ''}"

Responda diretamente ao lead. Seja cordial e breve.`;
            if (!lead.agent.organization.openaiApiKey) {
                console.error('[CRM Automation] No OpenAI API Key found');
                return;
            }
            const aiResponse = await this.openaiService.createChatCompletion(lead.agent.organization.openaiApiKey, lead.agent.organization.openaiModel || 'gpt-4o-mini', [{ role: 'system', content: systemPrompt }], { maxTokens: 300 });
            const conversation = await this.prisma.conversation.findFirst({
                where: { leadId: lead.id, organizationId: lead.organizationId }
            });
            if (conversation) {
                await this.prisma.message.create({
                    data: {
                        conversationId: conversation.id,
                        content: aiResponse,
                        fromMe: true,
                        type: 'TEXT',
                        messageId: crypto.randomUUID(),
                        thought: 'Disparo Automático de Agendamento (Stage Trigger)'
                    }
                });
                await this.whatsappService.sendMessage(lead.agent.organization.evolutionInstanceName, lead.phone, aiResponse);
                console.log('[CRM Automation] Auto scheduling message sent.');
            }
        }
        catch (error) {
            console.error('[CRM Automation] Error in auto scheduling:', error);
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
        zapsign_service_1.ZapSignService,
        scheduling_tools_service_1.SchedulingToolsService,
        whatsapp_integration_service_1.WhatsAppIntegrationService,
        openai_service_1.OpenAIService])
], CRMAutomationService);
//# sourceMappingURL=crm-automation.service.js.map