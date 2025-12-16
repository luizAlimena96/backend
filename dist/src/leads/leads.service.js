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
exports.LeadsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const openai_service_1 = require("../ai/services/openai.service");
const crm_automation_service_1 = require("../common/services/crm-automation.service");
let LeadsService = class LeadsService {
    prisma;
    openaiService;
    crmAutomationService;
    constructor(prisma, openaiService, crmAutomationService) {
        this.prisma = prisma;
        this.openaiService = openaiService;
        this.crmAutomationService = crmAutomationService;
    }
    async findAll(organizationId, agentId) {
        return this.prisma.lead.findMany({
            where: {
                organizationId,
                ...(agentId && { agentId }),
            },
            include: {
                agent: { select: { id: true, name: true } },
                appointments: true,
                _count: { select: { conversations: true } },
            },
            orderBy: { createdAt: "desc" },
        });
    }
    async findOne(id) {
        return this.prisma.lead.findUnique({
            where: { id },
            include: {
                agent: true,
                appointments: true,
                conversations: { include: { messages: true } },
            },
        });
    }
    async create(data) {
        return this.prisma.lead.create({
            data,
            include: { agent: true },
        });
    }
    async update(id, data) {
        const startLead = await this.prisma.lead.findUnique({ where: { id }, select: { crmStageId: true } });
        const updatedLead = await this.prisma.lead.update({
            where: { id },
            data,
        });
        if (data.crmStageId && startLead?.crmStageId !== data.crmStageId) {
            console.log(`[LeadsService] Stage changed for lead ${id}: ${startLead?.crmStageId} -> ${data.crmStageId}`);
            this.crmAutomationService.executeAutomationsForState(id, data.crmStageId).catch(err => {
                console.error(`[LeadsService] Error executing automations:`, err);
            });
        }
        return updatedLead;
    }
    async delete(id) {
        await this.prisma.lead.delete({ where: { id } });
        return { success: true };
    }
    async updateConversationSummary(leadId) {
        try {
            const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                    conversations: {
                        include: {
                            messages: {
                                orderBy: { timestamp: 'desc' },
                                take: 20,
                            },
                        },
                    },
                    agent: {
                        include: {
                            organization: {
                                select: {
                                    openaiApiKey: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!lead || !lead.conversations.length) {
                console.log(`[Lead] No conversations found for lead ${leadId}`);
                return;
            }
            const messages = lead.conversations[0].messages
                .reverse()
                .map(m => `${m.fromMe ? 'Bot' : 'Lead'}: ${m.content}`)
                .join('\n');
            if (!messages) {
                console.log(`[Lead] No messages to summarize for lead ${leadId}`);
                return;
            }
            const apiKey = lead.agent.organization.openaiApiKey;
            if (!apiKey) {
                console.error('[Lead] No OpenAI API key available');
                return;
            }
            const prompt = `Resuma a seguinte conversa entre um lead e um assistente de vendas.
Foque em: interesses do lead, dúvidas principais, objeções mencionadas, e próximos passos.
Seja conciso e objetivo. Máximo 150 palavras.

Conversa:
${messages}

Resumo:`;
            const response = await this.openaiService.createChatCompletion(apiKey, 'gpt-4o-mini', [{ role: 'user', content: prompt }]);
            const summary = response;
            await this.prisma.lead.update({
                where: { id: leadId },
                data: {
                    conversationSummary: summary,
                },
            });
            console.log(`[Lead] Updated conversation summary for ${leadId}`);
        }
        catch (error) {
            console.error(`[Lead] Error updating conversation summary:`, error);
        }
    }
};
exports.LeadsService = LeadsService;
exports.LeadsService = LeadsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_service_1.OpenAIService,
        crm_automation_service_1.CRMAutomationService])
], LeadsService);
//# sourceMappingURL=leads.service.js.map