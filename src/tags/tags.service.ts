import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.tag.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }

  async create(data: any) {
    return this.prisma.tag.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.tag.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.prisma.tag.delete({ where: { id } });
    return { success: true };
  }
}
