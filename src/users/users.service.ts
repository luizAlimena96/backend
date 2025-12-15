import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId?: string) {
    return this.prisma.user.findMany({
      where: organizationId ? { organizationId } : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        allowedTabs: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        allowedTabs: true,
        organization: true,
      },
    });
  }

  async update(id: string, data: any) {
    const { password, ...updateData } = data;
    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }
}
