import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class QuickResponsesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.quickResponse.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: any) {
    return this.prisma.quickResponse.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.quickResponse.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.quickResponse.delete({ where: { id } });
    return { success: true };
  }
}
