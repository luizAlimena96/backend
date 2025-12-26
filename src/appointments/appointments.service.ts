import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) { }

  async findAll(organizationId: string, leadId?: string) {
    return this.prisma.appointment.findMany({
      where: {
        organizationId,
        ...(leadId && { leadId }),
      },
      include: {
        lead: { select: { name: true, phone: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });
  }

  async findOne(id: string) {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        lead: true,
        reminders: true,
      },
    });
  }

  async create(data: any) {
    return this.prisma.appointment.create({
      data,
      include: { lead: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.appointment.update({ where: { id }, data });
  }

  async delete(id: string) {
    // Check if appointment exists before attempting delete
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      console.log(`[Appointments] Appointment ${id} not found for deletion`);
      return { success: false, message: 'Appointment not found' };
    }

    await this.prisma.appointment.delete({ where: { id } });
    return { success: true };
  }
}
