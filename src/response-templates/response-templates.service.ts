import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class ResponseTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string, category?: string) {
    return this.prisma.responseTemplate.findMany({
      where: {
        organizationId,
        ...(category && { category }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: any) {
    return this.prisma.responseTemplate.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.responseTemplate.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.responseTemplate.delete({ where: { id } });
    return { success: true };
  }
}
