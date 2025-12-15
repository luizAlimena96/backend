import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) { }

  async findAll(organizationId?: string) {
    const where = organizationId ? { organizationId } : {};

    const feedbacks = await this.prisma.feedback.findMany({
      where,
      include: {
        conversation: {
          include: { lead: { select: { name: true, phone: true } } },
        },
        responses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform database fields to frontend expected format
    return feedbacks.map(fb => ({
      ...fb,
      customerName: fb.customer,
      comment: fb.message,
      date: new Date(fb.createdAt).toLocaleDateString('pt-BR'),
    }));
  }

  async findOne(id: string) {
    return this.prisma.feedback.findUnique({
      where: { id },
      include: {
        conversation: { include: { lead: true, messages: true } },
        responses: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async create(data: any) {
    // Map frontend field names to database field names
    const feedbackData: any = {
      customer: data.customerName || data.customer,
      phone: data.phone,
      rating: data.rating || 3,
      message: data.comment || data.message,
      status: 'PENDING',
      severity: data.severity || 'MEDIUM',
    };

    // Add optional fields
    if (data.conversationId) {
      feedbackData.conversationId = data.conversationId;
    }
    if (data.organizationId) {
      feedbackData.organizationId = data.organizationId;
    }

    return this.prisma.feedback.create({
      data: feedbackData,
      include: { conversation: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.feedback.update({ where: { id }, data });
  }

  async resolve(id: string, response: string) {
    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: "RESOLVED",
        response,
        resolvedAt: new Date(),
      },
    });
  }

  async reopen(id: string) {
    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: "PENDING",
        resolvedAt: null,
      },
    });
  }
}
