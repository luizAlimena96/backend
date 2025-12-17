import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class StatesService {
  constructor(private prisma: PrismaService) { }

  async findAll(agentId: string) {
    return this.prisma.state.findMany({
      where: { agentId },
      orderBy: { order: "asc" },
    });
  }

  async create(data: any) {
    return this.prisma.state.create({ data });
  }

  async update(id: string, data: any) {
    try {
      console.log(`[StatesService] Updating state ${id} with data:`, data);

      // Extract only updateable fields to prevent Prisma errors
      const {
        name, missionPrompt, availableRoutes, dataKey, dataDescription,
        dataType, mediaId, tools, prohibitions, responseType, crmStatus, order,
        crmStageId, mediaTiming, dataCollections, mediaItems
      } = data;

      return await this.prisma.state.update({
        where: { id },
        data: {
          name, missionPrompt, availableRoutes, dataKey, dataDescription,
          dataType, mediaId, tools, prohibitions, responseType, crmStatus, order: order ? parseInt(order.toString()) : undefined,
          crmStageId, mediaTiming, dataCollections, mediaItems
        }
      });
    } catch (error) {
      console.error(`[StatesService] Error updating state ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string) {
    await this.prisma.state.delete({ where: { id } });
    return { success: true };
  }
}
