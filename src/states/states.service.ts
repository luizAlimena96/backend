import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class StatesService {
  constructor(private prisma: PrismaService) { }

  async findAll(agentId: string, user?: any) {
    if (!agentId) {
      throw new BadRequestException("Agent ID is required");
    }

    // Verify if agent exists and belongs to user's organization (if not super admin)
    // We fetch the agent to ensure it exists and check organization
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      select: { organizationId: true }
    });

    if (!agent) {
      throw new NotFoundException("Agent not found");
    }

    if (user && user.role !== 'SUPER_ADMIN' && agent.organizationId !== user.organizationId) {
      throw new ForbiddenException("You do not have permission to access states for this agent");
    }

    return this.prisma.state.findMany({
      where: { agentId },
      orderBy: { order: "asc" },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.state.create({ data });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Já existe um estado com este nome para este agente.');
      }
      throw error;
    }
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
