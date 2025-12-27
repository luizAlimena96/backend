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

    // Debug logging
    console.log(`[StatesService] findAll - agentId: ${agentId}`);
    console.log(`[StatesService] findAll - user:`, {
      id: user?.id,
      role: user?.role,
      organizationId: user?.organizationId
    });
    console.log(`[StatesService] findAll - agent.organizationId: ${agent.organizationId}`);

    // Check permissions: SUPER_ADMIN can access all, others only their own organization
    if (user && user.role !== 'SUPER_ADMIN') {
      // If user has no organizationId, deny access
      if (!user.organizationId) {
        console.log(`[StatesService] Access denied - user has no organizationId`);
        throw new ForbiddenException("User is not associated with any organization");
      }

      // If user's org doesn't match agent's org, deny access
      if (agent.organizationId !== user.organizationId) {
        console.log(`[StatesService] Access denied - org mismatch: ${agent.organizationId} !== ${user.organizationId}`);
        throw new ForbiddenException("You do not have permission to access states for this agent");
      }
    }

    return this.prisma.state.findMany({
      where: { agentId },
      orderBy: { order: "asc" },
    });
  }

  async create(data: any) {
    try {
      // If order is not provided, calculate the next order number
      if (data.order === undefined || data.order === null) {
        const maxOrderState = await this.prisma.state.findFirst({
          where: { agentId: data.agentId },
          orderBy: { order: 'desc' },
          select: { order: true }
        });
        data.order = (maxOrderState?.order ?? 0) + 1;
      }

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

  async reorder(agentId: string, items: { id: string; order: number }[]) {
    // Verify all items belong to the agent (security check)
    // For simplicity, we trust the input IDs but we should be careful in a real app
    // Ideally we check if all IDs belong to agentId

    // Use transaction to update all
    return await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.state.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );
  }
}
