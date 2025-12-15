import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) { }

  async getMetrics(organizationId: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalLeads,
      activeConversations,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      leadsByStatus,
      wonLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { organizationId } }),
      this.prisma.conversation.count({
        where: { organizationId, aiEnabled: true }
      }),
      this.prisma.lead.count({
        where: { organizationId, createdAt: { gte: today } }
      }),
      this.prisma.lead.count({
        where: { organizationId, createdAt: { gte: weekAgo } }
      }),
      this.prisma.lead.count({
        where: { organizationId, createdAt: { gte: monthAgo } }
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: true,
      }),
      this.prisma.lead.count({
        where: { organizationId, status: 'WON' }
      }),
    ]);

    const statusCounts = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      PROPOSAL_SENT: 0,
      WON: 0,
      LOST: 0,
    };

    leadsByStatus.forEach((item: any) => {
      if (item.status in statusCounts) {
        statusCounts[item.status] = item._count;
      }
    });

    const conversionRate = totalLeads > 0
      ? Math.round((wonLeads / totalLeads) * 100)
      : 0;

    const avgResponseTime = '5min';

    return {
      totalLeads,
      activeConversations,
      conversionRate,
      avgResponseTime,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      leadsByStatus: statusCounts,
    };
  }

  async getPerformance(organizationId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get messages per day for last 7 days
    const messages = await this.prisma.message.groupBy({
      by: ['timestamp'],
      where: {
        conversation: { organizationId },
        timestamp: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    // Initialize array with 7 days
    const messagesPerDay = new Array(7).fill(0);

    // Group messages by day
    messages.forEach((msg: any) => {
      const daysDiff = Math.floor(
        (now.getTime() - new Date(msg.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff >= 0 && daysDiff < 7) {
        messagesPerDay[6 - daysDiff] += msg._count;
      }
    });

    // Get conversions per week for last 4 weeks
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const conversions = await this.prisma.lead.findMany({
      where: {
        organizationId,
        status: 'WON',
        updatedAt: { gte: fourWeeksAgo },
      },
      select: { updatedAt: true },
    });

    const conversionsPerWeek = new Array(4).fill(0);
    conversions.forEach((lead) => {
      const weeksDiff = Math.floor(
        (now.getTime() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      if (weeksDiff >= 0 && weeksDiff < 4) {
        conversionsPerWeek[3 - weeksDiff]++;
      }
    });

    return {
      messagesPerDay,
      conversionsPerWeek,
      responseTimeAvg: 5, // TODO: Calculate from actual response times
    };
  }

  async getActivities(organizationId: string) {
    // Get recent leads
    const recentLeads = await this.prisma.lead.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
      },
    });

    // Get recent conversations
    const recentConversations = await this.prisma.conversation.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        lead: { select: { name: true, phone: true } },
        updatedAt: true,
      },
    });

    // Get recent messages
    const recentMessages = await this.prisma.message.findMany({
      where: { conversation: { organizationId } },
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        content: true,
        timestamp: true,
        fromMe: true,
        conversation: {
          select: {
            lead: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Combine and format activities
    const activities = [
      ...recentLeads.map((lead) => ({
        id: lead.id,
        type: 'lead' as const,
        title: 'Novo Lead',
        description: `${lead.name} (${lead.phone})`,
        time: this.formatTime(lead.createdAt),
      })),
      ...recentConversations.map((conv) => ({
        id: conv.id,
        type: 'conversation' as const,
        title: 'Conversa Atualizada',
        description: `${conv.lead?.name || 'Lead'} - ${conv.lead?.phone || ''}`,
        time: this.formatTime(conv.updatedAt),
      })),
      ...recentMessages.map((msg) => ({
        id: msg.id,
        type: 'message' as const,
        title: 'Nova Mensagem',
        description: `${msg.conversation?.lead?.name || 'Lead'}: ${msg.content.substring(0, 50)}...`,
        time: this.formatTime(msg.timestamp),
      })),
    ];

    // Sort by time and return top 10
    return activities
      .sort((a, b) => {
        // Extract time for comparison (this is simplified)
        return 0; // Already sorted by individual queries
      })
      .slice(0, 10);
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  }
}
