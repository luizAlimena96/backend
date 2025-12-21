import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { OpenAIService } from "../ai/services/openai.service";

import { CRMAutomationService } from "../common/services/crm-automation.service";
import { CrmAutomationsService } from "../crm-automations/crm-automations.service";

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private openaiService: OpenAIService,
    private crmAutomationService: CRMAutomationService,
    private crmEngine: CrmAutomationsService,
  ) { }

  async findAll(organizationId: string, agentId?: string) {
    return this.prisma.lead.findMany({
      where: {
        organizationId,
        ...(agentId && { agentId }),
      },
      include: {
        agent: { select: { id: true, name: true } },
        appointments: true,
        conversations: {
          take: 1,
          select: {
            id: true,
            tags: true,
          },
        },
        _count: { select: { conversations: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        agent: true,
        appointments: true,
        conversations: { include: { messages: true } },
      },
    });
  }

  async create(data: any) {
    const lead = await this.prisma.lead.create({
      data,
      include: { agent: true },
    });

    // Trigger LEAD_CREATED automation
    this.crmEngine.trigger('LEAD_CREATED', {
      organizationId: lead.organizationId,
      leadId: lead.id,
      data: lead
    });

    return lead;
  }

  async update(id: string, data: any) {
    const startLead = await this.prisma.lead.findUnique({ where: { id }, select: { crmStageId: true } });

    const updatedLead = await this.prisma.lead.update({
      where: { id },
      data,
    });

    // Check for CRM Stage change
    if (data.crmStageId && startLead?.crmStageId !== data.crmStageId) {
      console.log(`[LeadsService] Stage changed for lead ${id}: ${startLead?.crmStageId} -> ${data.crmStageId}`);
      // Run async to not block response

      // Legacy Automation
      this.crmAutomationService.executeAutomationsForState(id, data.crmStageId).catch(err => {
        console.error(`[LeadsService] Error executing automations:`, err);
      });

      // New Automation Engine
      this.crmEngine.trigger('STAGE_CHANGE', {
        organizationId: updatedLead.organizationId,
        leadId: updatedLead.id,
        data: {
          oldStageId: startLead?.crmStageId,
          newStageId: data.crmStageId,
          stageId: data.crmStageId // For simpler matching logic
        }
      });
    }

    return updatedLead;
  }

  async delete(id: string) {
    await this.prisma.lead.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Generate and update conversation summary for personalized follow-ups
   */
  async updateConversationSummary(leadId: string): Promise<void> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          conversations: {
            include: {
              messages: {
                orderBy: { timestamp: 'desc' },
                take: 20, // Last 20 messages
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

      // Get last messages
      const messages = lead.conversations[0].messages
        .reverse()
        .map(m => `${m.fromMe ? 'Bot' : 'Lead'}: ${m.content}`)
        .join('\n');

      if (!messages) {
        console.log(`[Lead] No messages to summarize for lead ${leadId}`);
        return;
      }

      // Get API key
      const apiKey = lead.agent.organization.openaiApiKey;
      if (!apiKey) {
        console.error('[Lead] No OpenAI API key available');
        return;
      }

      // Generate summary with OpenAI
      const prompt = `Resuma a seguinte conversa entre um lead e um assistente de vendas.
Foque em: interesses do lead, dúvidas principais, objeções mencionadas, e próximos passos.
Seja conciso e objetivo. Máximo 150 palavras.

Conversa:
${messages}

Resumo:`;

      const response = await this.openaiService.createChatCompletion(
        apiKey,
        'gpt-4o-mini',
        [{ role: 'user', content: prompt }],
      );

      const summary = response;

      // Update lead
      await this.prisma.lead.update({
        where: { id: leadId },
        data: {
          conversationSummary: summary,
        },
      });

      console.log(`[Lead] Updated conversation summary for ${leadId}`);
    } catch (error) {
      console.error(`[Lead] Error updating conversation summary:`, error);
    }
  }
}
