import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CrmConfigsService {
    constructor(private prisma: PrismaService) { }

    async findAll(organizationId: string) {
        return this.prisma.cRMConfig.findMany({
            where: { organizationId },
            include: {
                templates: true,
                automations: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, organizationId: string) {
        const config = await this.prisma.cRMConfig.findUnique({
            where: { id },
            include: {
                templates: true,
                automations: true,
            },
        });

        if (!config) {
            throw new NotFoundException('CRM config not found');
        }

        if (config.organizationId !== organizationId) {
            throw new ForbiddenException('Access denied');
        }

        return config;
    }

    async create(data: any) {
        return this.prisma.cRMConfig.create({
            data: {
                name: data.name,
                crmType: data.crmType,
                baseUrl: data.baseUrl,
                authType: data.authType,
                apiKey: data.apiKey,
                organizationId: data.organizationId,
                isActive: data.isActive ?? true,
            },
            include: {
                templates: true,
                automations: true,
            },
        });
    }

    async update(id: string, data: any, organizationId: string) {
        // Verify ownership
        await this.findOne(id, organizationId);

        return this.prisma.cRMConfig.update({
            where: { id },
            data: {
                name: data.name,
                crmType: data.crmType,
                baseUrl: data.baseUrl,
                authType: data.authType,
                apiKey: data.apiKey,
                isActive: data.isActive,
            },
            include: {
                templates: true,
                automations: true,
            },
        });
    }

    async delete(id: string, organizationId: string) {
        // Verify ownership
        await this.findOne(id, organizationId);

        return this.prisma.cRMConfig.delete({
            where: { id },
        });
    }
}
