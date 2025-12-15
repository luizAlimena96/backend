import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class KnowledgeService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, agentId?: string) {
    return this.prisma.knowledge.findMany({
      where: {
        organizationId,
        ...(agentId && { agentId }),
      },
      include: {
        agent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: any) {
    return this.prisma.knowledge.create({
      data: {
        ...data,
        type: data.type || "TEXT",
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.knowledge.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.prisma.knowledge.delete({ where: { id } });
    return { success: true };
  }
}
