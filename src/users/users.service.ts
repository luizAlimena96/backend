import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

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

  async updateProfile(userId: string, data: { newPassword?: string; name?: string; email?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.newPassword) {
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async createUser(organizationId: string, data: { name: string; email: string; password: string; role: string; allowedTabs: string[] }) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: (data.role as any) || 'USER',
        allowedTabs: data.allowedTabs,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        allowedTabs: true,
        createdAt: true,
      },
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}

