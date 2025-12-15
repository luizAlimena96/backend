import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class CRMService {
  constructor(private prisma: PrismaService) { }

  async findAllConfigs(organizationId: string) {
    return this.prisma.cRMConfig.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createConfig(data: any) {
    return this.prisma.cRMConfig.create({ data });
  }

  async updateConfig(id: string, data: any) {
    return this.prisma.cRMConfig.update({ where: { id }, data });
  }

  async deleteConfig(id: string) {
    await this.prisma.cRMConfig.delete({ where: { id } });
    return { success: true };
  }

  async findAllStages(agentId: string) {
    return this.prisma.cRMStage.findMany({
      where: { agentId },
      orderBy: { order: "asc" },
    });
  }

  async createStage(data: any) {
    return this.prisma.cRMStage.create({ data });
  }

  async updateStage(id: string, data: any) {
    return this.prisma.cRMStage.update({ where: { id }, data });
  }

  async deleteStage(id: string) {
    await this.prisma.cRMStage.delete({ where: { id } });
    return { success: true };
  }

  async reorderStages(agentId: string, stageIds: string[]) {
    const updates = stageIds.map((id, index) =>
      this.prisma.cRMStage.update({
        where: { id },
        data: { order: index },
      })
    );
    await this.prisma.$transaction(updates);
    return { success: true };
  }

  async findAllAutomations(crmConfigId: string) {
    return this.prisma.cRMAutomation.findMany({
      where: { crmConfigId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAutomation(data: any) {
    return this.prisma.cRMAutomation.create({ data });
  }

  async updateAutomation(id: string, data: any) {
    return this.prisma.cRMAutomation.update({ where: { id }, data });
  }

  async deleteAutomation(id: string) {
    await this.prisma.cRMAutomation.delete({ where: { id } });
    return { success: true };
  }
}
