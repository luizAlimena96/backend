import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { CrmAutomationsService } from "../crm-automations/crm-automations.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as crypto from 'crypto';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private crmEngine: CrmAutomationsService,
    private eventEmitter: EventEmitter2,
  ) { }

  async findAll(organizationId: string) {
    return this.prisma.conversation.findMany({
      where: { organizationId },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        messages: { orderBy: { timestamp: "desc" }, take: 1 },
        agent: { select: { id: true, name: true } },
        tags: true,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        lead: true,
        agent: true,
        messages: { orderBy: { timestamp: "asc" } },
        tags: true,
      },
    });
  }

  async create(data: any) {
    const existing = await this.prisma.conversation.findFirst({
      where: { whatsapp: data.whatsapp, organizationId: data.organizationId },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data,
      include: { lead: true, agent: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async toggleAI(id: string, enabled: boolean) {
    return this.prisma.conversation.update({
      where: { id },
      data: { aiEnabled: enabled },
    });
  }

  // Messages
  async getMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: "asc" },
    });
  }

  async sendMessage(conversationId: string, content: string, fromMe: boolean = true) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        organization: {
          select: {
            evolutionApiUrl: true,
            evolutionApiKey: true,
            evolutionInstanceName: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Create message in database
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        content,
        fromMe,
        type: 'TEXT',
        messageId: crypto.randomUUID(),
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Send via Evolution API if from assistant
    if (fromMe && conversation.organization) {
      const { evolutionApiUrl, evolutionApiKey, evolutionInstanceName } = conversation.organization;

      if (evolutionApiUrl && evolutionApiKey && evolutionInstanceName) {
        try {
          const response = await fetch(`${evolutionApiUrl}/message/sendText/${evolutionInstanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey,
            },
            body: JSON.stringify({
              number: conversation.whatsapp,
              text: content,
            }),
          });

          if (!response.ok) {
            console.error('Evolution API error:', await response.text());
          }
        } catch (error) {
          console.error('Error sending via Evolution API:', error);
        }
      }
    }

    // Emit new message event
    this.eventEmitter.emit('conversation.message', {
      conversationId,
      message: {
        id: message.id,
        content: message.content,
        time: message.timestamp,
        sent: message.fromMe,
        read: true,
        role: message.fromMe ? 'assistant' : 'user',
        type: message.type,
        mediaUrl: message.mediaUrl
      }
    });

    return message;
  }

  // Tags
  async addTag(conversationId: string, tagId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { tags: true },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Check if tag already exists
    if (conversation.tags.some(t => t.id === tagId)) {
      return conversation;
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        tags: {
          connect: { id: tagId },
        },
      },
      include: { tags: true },
    });

    // Trigger TAG_ADDED
    if (conversation.leadId) {
      this.crmEngine.trigger('TAG_ADDED', {
        organizationId: conversation.organizationId,
        leadId: conversation.leadId,
        data: { tagId, conversationId }
      });
    }

    return updated;
  }

  async removeTag(conversationId: string, tagId: string) {
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        tags: {
          disconnect: { id: tagId },
        },
      },
      include: { tags: true },
    });
  }
}

