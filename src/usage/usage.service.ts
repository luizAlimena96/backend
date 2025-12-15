import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsageService {
    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async getOpenAICosts(organizationId: string, period: 'day' | 'week' | 'month') {
        // Check if organization has OpenAI configured
        const org = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { openaiProjectId: true },
        });

        const configured = !!org?.openaiProjectId;

        if (!configured) {
            return { configured: false };
        }

        // TODO: Implement real OpenAI API cost fetching
        // This would call OpenAI's usage API
        // For now, return mock data

        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'day':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(now.getMonth() - 1);
                break;
        }

        return {
            configured: true,
            totalCost: 0, // TODO: Calculate from OpenAI API
            startDate: startDate.toLocaleDateString('pt-BR'),
            endDate: now.toLocaleDateString('pt-BR'),
        };
    }

    async getElevenLabsCosts(organizationId: string, period: 'day' | 'week' | 'month') {
        // Check if organization has ElevenLabs configured
        const org = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: { elevenLabsApiKey: true },
        });

        const configured = !!org?.elevenLabsApiKey;

        if (!configured) {
            return { configured: false };
        }

        // TODO: Implement real ElevenLabs API usage fetching
        // This would call ElevenLabs' usage API
        // For now, return mock data

        return {
            configured: true,
            usage: {
                charactersPerOrg: 0, // TODO: Calculate from ElevenLabs API
                estimatedCostUSD: '0.00',
            },
        };
    }
}
