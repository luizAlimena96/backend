import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface Report {
    id: string;
    title: string;
    type: string;
    period: string;
    generatedAt: string;
    status: 'completed' | 'processing';
    downloads?: number;
}

export interface ReportMetrics {
    relatoriosGerados: number;
    totalDownloads: number;
    tempoMedioGeracao: string;
    trends: {
        gerados: number;
        downloads: number;
        tempo: number;
    };
}

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getReports(organizationId?: string): Promise<Report[]> {
        const reports = await this.prisma.report.findMany({
            where: {
                organizationId
            },
            orderBy: {
                generatedAt: 'desc'
            }
        });

        // Map database model to frontend interface
        return reports.map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            period: r.period,
            generatedAt: r.generatedAt.toISOString(),
            status: r.status as 'completed' | 'processing',
            downloads: r.downloads
        }));
    }

    async getMetrics(organizationId?: string): Promise<ReportMetrics> {
        let where = {};
        if (organizationId) {
            where = { organizationId };
        }

        const reports = await this.prisma.report.findMany({ where });
        const completedReports = reports.filter(r => r.status === 'completed');

        const totalDownloads = reports.reduce((sum, r) => sum + r.downloads, 0);

        return {
            relatoriosGerados: reports.length,
            totalDownloads: totalDownloads,
            tempoMedioGeracao: '4.2s', // Mock logic for now
            trends: {
                gerados: 12, // Dummy trend
                downloads: 8,
                tempo: -0.5,
            },
        };
    }

    async generateReport(data: {
        title: string;
        type: string;
        period: string;
        organizationId: string; // Required now
        startDate?: string;
        endDate?: string;
        includeGraphs?: boolean;
        includeDetails?: boolean;
        format?: string;
    }): Promise<{ message: string; reportId?: string }> {

        // 1. Create Report in Processing state
        const report = await this.prisma.report.create({
            data: {
                organizationId: data.organizationId,
                title: data.title,
                type: data.type,
                period: data.period,
                format: data.format || 'PDF',
                status: 'processing',
            }
        });

        // 2. Simulate Async Process
        this.simulateReportGeneration(report.id);

        return {
            message: 'Relatório sendo gerado! Você será notificado quando estiver pronto.',
            reportId: report.id
        };
    }

    private async simulateReportGeneration(reportId: string) {
        // Wait 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

        const fs = require('fs');
        const os = require('os');
        const path = require('path');

        const filePath = path.join(os.tmpdir(), `report-${reportId}.txt`);
        fs.writeFileSync(filePath, `Relatório Gerado\nID: ${reportId}\nData: ${new Date().toISOString()}`);

        await this.prisma.report.update({
            where: { id: reportId },
            data: {
                status: 'completed',
                filePath: filePath,
                fileSize: 1024
            }
        });
        console.log(`[Reports] Report ${reportId} completed.`);
    }

    async downloadReport(id: string): Promise<Buffer> {
        const report = await this.prisma.report.findUnique({ where: { id } });

        if (!report || report.status !== 'completed' || !report.filePath) {
            throw new Error('Relatório não disponível');
        }

        const fs = require('fs');
        if (fs.existsSync(report.filePath)) {
            // Increment downloads
            await this.prisma.report.update({
                where: { id },
                data: { downloads: { increment: 1 } }
            });

            return fs.readFileSync(report.filePath);
        } else {
            // Fallback if file wiped from temp
            return Buffer.from("Conteúdo do relatório expirado ou removido.", 'utf-8');
        }
    }
}
