import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class StatesService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.state.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.state.delete({ where: { id } });
    return { success: true };
  }
}
