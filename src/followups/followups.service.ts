import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { WhatsAppIntegrationService } from "../integrations/whatsapp/whatsapp-integration.service";
import { OpenAIService } from "../ai/services/openai.service";

@Injectable()
export class FollowupsService {
  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppIntegrationService,
    private openaiService: OpenAIService,
  ) { }

  async findAll(agentId: string) {
    const followups = await this.prisma.followup.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
    });

    // Map backend fields to frontend fields
    return followups.map(followup => ({
      ...followup,
      messageTemplate: followup.message,
      delayMinutes: Math.round(followup.delayHours * 60),
    }));
  }

  async findOne(id: string) {
    const followup = await this.prisma.followup.findUnique({
      where: { id },
      include: { logs: true },
    });

    if (!followup) return null;

    const mapped = {
      ...followup,
      messageTemplate: followup.message,
      delayMinutes: Math.round(followup.delayHours * 60),
    }

    return mapped;
  }

  async create(data: any) {
    console.log('[Followups] Create data received:', JSON.stringify(data, null, 2));

    // Get organizationId from agent
    const agent = await this.prisma.agent.findUnique({
      where: { id: data.agentId },
      select: { organizationId: true },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Map only the fields that exist in Prisma schema
    const followupData = {
      name: data.name,
      message: data.messageTemplate || data.message || '',
      condition: 'ALWAYS',
      delayHours: data.delayMinutes ? data.delayMinutes / 60 : 0,
      isActive: data.isActive ?? true,
      agentId: data.agentId,
      organizationId: agent.organizationId,
      crmStageId: data.crmStageId || null,
      aiDecisionEnabled: data.aiDecisionEnabled ?? false,
      aiDecisionPrompt: data.aiDecisionPrompt || null,
      audioVoiceId: data.audioVoiceId || null,
      mediaType: data.mediaType || 'text',
      mediaUrl: data.mediaUrl || null,
      respectBusinessHours: data.businessHoursEnabled ?? false,
      specificHour: data.specificHour || null,
      specificMinute: data.specificMinute || null,
      specificTimeEnabled: data.specificTimeEnabled ?? false,
      delayMinutes: data.delayMinutes || 0,
    };

    console.log('[Followups] Creating with data:', JSON.stringify(followupData, null, 2));

    const created = await this.prisma.followup.create({ data: followupData });

    // Return with frontend field names
    return {
      ...created,
      messageTemplate: created.message,
      delayMinutes: Math.round(created.delayHours * 60),
    };
  }

  async update(id: string, data: any) {
    console.log('[Followups] Update data received:', JSON.stringify(data, null, 2));

    // Map only the fields that exist in Prisma schema (same as create)
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.messageTemplate !== undefined || data.message !== undefined) {
      updateData.message = data.messageTemplate || data.message || '';
    }
    if (data.delayMinutes !== undefined) {
      updateData.delayHours = data.delayMinutes / 60;
      updateData.delayMinutes = data.delayMinutes;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.crmStageId !== undefined) updateData.crmStageId = data.crmStageId;
    if (data.aiDecisionEnabled !== undefined) updateData.aiDecisionEnabled = data.aiDecisionEnabled;
    if (data.aiDecisionPrompt !== undefined) updateData.aiDecisionPrompt = data.aiDecisionPrompt;
    if (data.audioVoiceId !== undefined) updateData.audioVoiceId = data.audioVoiceId;
    if (data.mediaType !== undefined) updateData.mediaType = data.mediaType;
    if (data.mediaUrl !== undefined) updateData.mediaUrl = data.mediaUrl;
    if (data.businessHoursEnabled !== undefined) updateData.respectBusinessHours = data.businessHoursEnabled;
    if (data.specificHour !== undefined) updateData.specificHour = data.specificHour;
    if (data.specificMinute !== undefined) updateData.specificMinute = data.specificMinute;
    if (data.specificTimeEnabled !== undefined) updateData.specificTimeEnabled = data.specificTimeEnabled;

    console.log('[Followups] Updating with data:', JSON.stringify(updateData, null, 2));

    const updated = await this.prisma.followup.update({ where: { id }, data: updateData });

    // Return with frontend field names
    return {
      ...updated,
      messageTemplate: updated.message,
      delayMinutes: Math.round(updated.delayHours * 60),
    };
  }

  async delete(id: string) {
    await this.prisma.followup.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Check and send followups for all active rules
   * @param forceIgnoreDelay - If true, ignore time delay check (for manual triggers)
   */
  async checkAgentFollowUps(forceIgnoreDelay = false) {
    console.log('[Followups Service] Checking for pending follow-ups...', { forceIgnoreDelay });

    try {
      // Query active followups
      const activeFollowups = await this.prisma.followup.findMany({
        where: {
          isActive: true,
        },
        include: {
          agent: {
            include: {
              organization: {
                select: {
                  workingHours: true,
                  evolutionInstanceName: true,
                },
              },
            },
          },
        },
      });

      console.log(`[Followups Service] Found ${activeFollowups.length} active followup rules`);

      let processedCount = 0;

      // For each followup rule, check conversations that match conditions
      for (const followup of activeFollowups) {
        try {
          console.log(`[Followups Service] Processing followup: ${followup.name} (ID: ${followup.id})`);
          console.log(`[Followups Service] - CRM Stage: ${followup.crmStageId || 'ANY'}`);
          console.log(`[Followups Service] - Delay: ${followup.delayHours} hours (${Math.round(followup.delayHours * 60)} minutes)`);

          const eligibleConversations = await this.getFollowupEligibleConversations(followup);

          console.log(`[Followups Service] Found ${eligibleConversations.length} eligible conversations for followup ${followup.id}`);

          for (const conversation of eligibleConversations) {
            try {
              const shouldSend = forceIgnoreDelay || await this.checkFollowupConditions(conversation, followup);

              if (forceIgnoreDelay) {
                console.log(`[Followups] 🚀 FORCE MODE: Ignoring delay check for conversation ${conversation.id}`);
              }

              if (shouldSend) {
                await this.sendFollowup(conversation, followup);
                processedCount++;
              }
            } catch (error) {
              console.error(`[Followups Service] Error processing conversation ${conversation.id}:`, error);
            }
          }
        } catch (error) {
          console.error(`[Followups Service] Error processing followup ${followup.id}:`, error);
        }
      }

      console.log(`[Followups Service] Processed ${processedCount} follow-ups`);

      return {
        processed: processedCount,
        rulesChecked: activeFollowups.length,
      };
    } catch (error) {
      console.error('[Followups Service] Error in checkAgentFollowUps:', error);
      throw error;
    }
  }

  /**
   * Get conversations eligible for a specific followup rule
   * Follow-ups are sent to leads whose currentState belongs to the CRM stage's states
   */
  private async getFollowupEligibleConversations(followup: any) {
    let eligibleStates: string[] | null = null;

    if (followup.crmStageId) {
      const crmStage = await this.prisma.cRMStage.findUnique({
        where: { id: followup.crmStageId },
        include: {
          states: {
            select: { name: true },
          },
        },
      });

      if (crmStage && crmStage.states.length > 0) {
        eligibleStates = crmStage.states.map(s => s.name);
        console.log(`[Followups] CRM Stage "${crmStage.name}" has states:`, eligibleStates);
      }
    }

    const conversations = await this.prisma.conversation.findMany({
      where: {
        agentId: followup.agentId,
        aiEnabled: true,
        whatsapp: {
          not: {
            endsWith: '@g.us'
          }
        },
        lead: {
          ...(eligibleStates && eligibleStates.length > 0 && {
            currentState: {
              in: eligibleStates,
            },
          }),
        },
      },
      include: {
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        lead: {
          select: {
            id: true,
            name: true,
            status: true,
            currentState: true,
            crmStageId: true,
            conversationSummary: true,
            extractedData: true,
          },
        },
      },
    });

    const filtered = conversations.filter((conv: any) => conv.messages && conv.messages.length > 0);
    console.log(`[Followups] Filtered ${filtered.length} conversations with messages`);
    return filtered;
  }

  /**
   * Check if followup should be sent for a conversation
   */
  private async checkFollowupConditions(
    conversation: any,
    followup: any
  ): Promise<boolean> {
    // SECURITY: Never send follow-ups to groups anywhere
    if (conversation.whatsapp?.endsWith('@g.us')) {
      console.log(`[Followups] 🚫 Skipping: Target is a Group (${conversation.whatsapp})`);
      return false;
    }

    const lastMessage = conversation.messages[0];
    if (!lastMessage) {
      console.log(`[Followups] No messages in conversation ${conversation.id}`);
      return false;
    }

    const hoursSinceLastMessage =
      (Date.now() - lastMessage.timestamp.getTime()) / (1000 * 60 * 60);

    const minutesSinceLastMessage = Math.round(hoursSinceLastMessage * 60);

    console.log(`[Followups] Conversation ${conversation.id}:`);
    console.log(`  - Lead: ${conversation.lead?.name} (${conversation.leadId})`);
    console.log(`  - Last message: ${minutesSinceLastMessage} minutes ago`);
    console.log(`  - Required delay: ${Math.round(followup.delayHours * 60)} minutes`);
    console.log(`  - Time check: ${hoursSinceLastMessage >= followup.delayHours ? '✅ PASS' : '❌ FAIL'}`);

    if (hoursSinceLastMessage < followup.delayHours) {
      console.log(`  ⏱️ Skipping: Not enough time passed`);
      return false;
    }

    if (conversation.lead?.status === 'inactive' || conversation.lead?.status === 'converted') {
      console.log(`  ❌ Skipping: Lead is ${conversation.lead.status}`);
      return false;
    }

    if (conversation.leadId) {
      const alreadySent = await this.prisma.followupLog.findFirst({
        where: {
          leadId: conversation.leadId,
          followupId: followup.id,
        },
      });

      if (alreadySent) {
        console.log(`  🔒 Skipping: Follow-up already sent to this lead on ${alreadySent.sentAt.toLocaleString()}`);
        return false;
      }
    }

    if (followup.agent?.organization?.workingHours) {
      const isWithinWorkingHours = this.checkWorkingHours(
        followup.agent.organization.workingHours
      );

      if (!isWithinWorkingHours) {
        console.log(`[Followups Service] Outside working hours, skipping`);
        return false;
      }
    }

    return true;
  }

  /**
   * Send followup message
   */
  private async sendFollowup(conversation: any, followup: any): Promise<void> {
    // Use organization.evolutionInstanceName (not agent.instance) for WhatsApp API
    const instanceName = followup.agent?.organization?.evolutionInstanceName;
    const recipient = conversation.whatsapp;

    // CRITICAL: Validate instance name exists before attempting to send
    if (!instanceName) {
      console.error(`[Followups Service] ❌ No instance configured for agent ${followup.agentId}`);
      // Log as failed to prevent retry
      if (conversation.leadId) {
        await this.prisma.followupLog.create({
          data: {
            leadId: conversation.leadId,
            followupId: followup.id,
            message: `[ERRO] Instância não configurada para o agente`,
          },
        });
      }
      return; // Don't throw - prevents retry
    }

    console.log(`[Followups] 📤 Preparing to send follow-up:`);
    console.log(`  - Instance: ${instanceName}`);
    console.log(`  - Recipient: ${recipient}`);
    console.log(`  - Agent ID: ${followup.agentId}`);
    console.log(`  - Follow-up ID: ${followup.id}`);

    let messageToSend = followup.message;

    try {
      if (followup.aiDecisionEnabled && followup.aiDecisionPrompt) {
        console.log(`[Followups] 🤖 AI mode enabled - generating personalized message`);

        try {
          // Get conversation history for context
          const messages = await this.prisma.message.findMany({
            where: { conversationId: conversation.id },
            orderBy: { timestamp: 'asc' },
            take: 20, // Last 20 messages for context
          });

          const conversationContext = messages
            .map(m => `${m.fromMe ? 'Assistente' : 'Lead'}: ${m.content}`)
            .join('\n');

          // Generate AI message using custom prompt
          const aiPrompt = `${followup.aiDecisionPrompt}

Contexto do Lead:
- Nome: ${conversation.lead?.name || 'Não informado'}
- Telefone: ${conversation.whatsapp}

Histórico da Conversa (últimas mensagens):
${conversationContext}

Gere uma mensagem de follow-up personalizada baseada neste contexto.`;

          // Get OpenAI API key from agent's organization
          const organization = await this.prisma.organization.findUnique({
            where: { id: followup.organizationId },
            select: { openaiApiKey: true },
          });

          if (!organization?.openaiApiKey) {
            throw new Error('OpenAI API key not configured for organization');
          }

          messageToSend = await this.openaiService.createChatCompletion(
            organization.openaiApiKey,
            'gpt-4o-mini',
            [
              {
                role: 'system',
                content: 'Você é um assistente que cria mensagens de follow-up personalizadas para leads. Seja natural, empático e direto.',
              },
              {
                role: 'user',
                content: aiPrompt,
              },
            ],
            {
              temperature: 0.7,
              maxTokens: 500,
            }
          );

          console.log(`[Followups] ✅ AI generated message: ${messageToSend.substring(0, 100)}...`);
        } catch (error) {
          console.error(`[Followups] ❌ Error generating AI message:`, error.message);
          console.log(`[Followups] ⚠️ Falling back to template message`);
          // Fall back to template message if AI fails
        }
      }

      // Personalize template message with variables (only if not using AI)
      if (!followup.aiDecisionEnabled && conversation.lead) {
        const leadName = conversation.lead.name || 'você';

        // Support variable format: {{nome}}
        messageToSend = messageToSend.replace(/\{\{nome\}\}/g, leadName);
      }

      console.log(`  - Message: ${messageToSend.substring(0, 100)}...`);

      // Check if this is Test AI environment
      const isTestAI = recipient.startsWith('test_') || conversation.lead?.name?.includes('Test User');

      // CRITICAL: Log the followup BEFORE sending to prevent infinite retries
      // This ensures that even if send fails, we won't retry the same conversation
      if (conversation.leadId) {
        await this.prisma.followupLog.create({
          data: {
            leadId: conversation.leadId,
            followupId: followup.id,
            message: messageToSend,
          },
        });
        console.log(`[Followups] ✅ Created followup log (prevents retry)`);
      }

      // Always save message to conversation (for both Test AI and real WhatsApp)
      await this.prisma.message.create({
        data: {
          messageId: `followup_${followup.id}_${Date.now()}`,
          conversationId: conversation.id,
          content: messageToSend,
          fromMe: true,
          type: 'TEXT',
          timestamp: new Date(),
        },
      });

      console.log(`[Followups] ✅ Saved follow-up message to conversation`);

      // Send via Evolution API only for real WhatsApp (not Test AI)
      if (!isTestAI) {
        try {
          if (followup.mediaType === 'text' || !followup.mediaType) {
            console.log(`[Followups] 📨 Sending text message via Evolution API...`);
            await this.whatsappService.sendMessage(instanceName, recipient, messageToSend);
          } else if (followup.mediaType === 'media' && followup.mediaUrl) {
            console.log(`[Followups] 📷 Sending media message via Evolution API...`);
            await this.whatsappService.sendMedia(instanceName, recipient, followup.mediaUrl, messageToSend);
          }

          console.log(`[Followups Service] ✅ Sent follow-up to ${recipient} via Evolution API`);
        } catch (sendError: any) {
          // Classify error - don't retry 4xx errors (client errors)
          const statusCode = sendError?.response?.status || sendError?.status;

          if (statusCode >= 400 && statusCode < 500) {
            // 4xx errors: Instance not found, bad request, etc.
            // These are permanent failures - DO NOT RETRY
            console.error(`[Followups Service] ❌ Permanent failure (${statusCode}): ${sendError.message}`);
            console.error(`[Followups Service] ⚠️ Instance "${instanceName}" may not exist or is offline`);
            // Don't throw - message was logged, won't retry
          } else {
            // 5xx or network errors - could be temporary
            console.error(`[Followups Service] ⚠️ Temporary failure (${statusCode}): ${sendError.message}`);
            // Still don't throw - log was already created, won't retry
          }
        }
      } else {
        console.log(`[Followups] 🧪 Test AI detected - skipping Evolution API send`);
      }

    } catch (error) {
      // General error during message preparation
      console.error(`[Followups Service] ❌ Error in follow-up preparation:`, error.message);
      // Log was already created, so this won't retry
    }
  }


  /**
   * Check if current time is within working hours
   */
  private checkWorkingHours(workingHours: any): boolean {
    if (!workingHours) return true;

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[currentDay];

    if (!workingHours[dayName]?.enabled) {
      return false;
    }

    const startTime = this.parseTime(workingHours[dayName].start);
    const endTime = this.parseTime(workingHours[dayName].end);

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Parse time string to minutes
   */
  private parseTime(timeStr: string): number {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
