import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AgentsService {
  constructor(private prisma: PrismaService) { }

  async findAll(organizationId?: string) {
    return this.prisma.agent.findMany({
      where: organizationId ? { organizationId } : {},
      include: {
        organization: { select: { id: true, name: true, slug: true, preferredChannel: true } },
        user: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            leads: true,
            conversations: true,
            knowledge: true,
            states: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, include?: string) {
    const includeOptions: any = {
      _count: {
        select: {
          leads: true,
          conversations: true,
          knowledge: true,
          followups: true,
          reminders: true,
        },
      },
    };

    if (include) {
      const relations = include.split(",");
      if (relations.includes("states")) includeOptions.states = true;
      if (relations.includes("crmStages")) includeOptions.crmStages = true;
      if (relations.includes("followups")) includeOptions.followUps = true;
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: includeOptions,
    });

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    return agent;
  }

  async create(data: any, userId: string, organizationId: string) {
    const existing = await this.prisma.agent.findUnique({
      where: { instance: data.instance },
    });

    if (existing) {
      throw new Error("Agente com esta instance já existe");
    }

    return this.prisma.agent.create({
      data: {
        ...data,
        userId,
        organizationId,
        tone: data.tone || "FRIENDLY",
        language: data.language || "pt-BR",
        isActive: true,
      },
      include: {
        organization: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, data: any) {
    const { id: _id, createdAt, updatedAt, organizationId, userId, _count, organization, user, ...updateData } = data;

    if (updateData.tone && typeof updateData.tone === "string") {
      updateData.tone = updateData.tone.toUpperCase();
    }

    return this.prisma.agent.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    await this.prisma.agent.delete({ where: { id } });
    return { success: true };
  }
}
