import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../database/prisma.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
    constructor(private prisma: PrismaService) { }

    @Post('assume-organization')
    async assumeOrganization(@Body('organizationId') organizationId: string | null) {
        // This endpoint is used by SUPER_ADMIN to switch between organizations
        // It doesn't actually change anything in the database, just returns the organization info
        // The frontend uses this to update the URL parameter

        if (!organizationId) {
            return {
                organizationId: null,
                organizationName: null,
                message: 'Visualizando todas as organizações',
            };
        }

        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });

        if (!organization) {
            throw new Error('Organização não encontrada');
        }

        return {
            organizationId: organization.id,
            organizationName: organization.name,
            message: `Agora trabalhando como: ${organization.name}`,
        };
    }

    @Get('data')
    async getData(
        @Query('orgId') orgId: string,
        @Query('type') type: string,
    ) {
        if (!orgId || !type) {
            return [];
        }

        switch (type) {
            case 'leads':
                return this.prisma.lead.findMany({
                    where: { organizationId: orgId },
                    orderBy: { createdAt: 'desc' },
                });

            case 'followups':
                return this.prisma.followup.findMany({
                    where: { organizationId: orgId },
                    orderBy: { createdAt: 'desc' },
                });

            case 'knowledge':
                return this.prisma.knowledge.findMany({
                    where: { organizationId: orgId },
                    orderBy: { createdAt: 'desc' },
                });

            case 'states':
                return this.prisma.state.findMany({
                    where: { organizationId: orgId },
                    orderBy: { order: 'asc' },
                });

            case 'appointments':
                return this.prisma.appointment.findMany({
                    where: { organizationId: orgId },
                    include: { lead: true },
                    orderBy: { scheduledAt: 'desc' },
                });

            case 'conversations':
                return this.prisma.conversation.findMany({
                    where: { organizationId: orgId },
                    include: {
                        lead: true,
                        _count: { select: { messages: true } },
                    },
                    orderBy: { updatedAt: 'desc' },
                });

            default:
                return [];
        }
    }
}
