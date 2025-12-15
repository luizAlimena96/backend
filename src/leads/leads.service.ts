import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, agentId?: string) {
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
    return this.prisma.lead.create({
      data,
      include: { agent: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.lead.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.prisma.lead.delete({ where: { id } });
    return { success: true };
  }
}
