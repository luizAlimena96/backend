"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getReports(organizationId) {
        const reports = await this.prisma.report.findMany({
            where: {
                organizationId
            },
            orderBy: {
                generatedAt: 'desc'
            }
        });
        return reports.map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            period: r.period,
            generatedAt: r.generatedAt.toISOString(),
            status: r.status,
            downloads: r.downloads
        }));
    }
    async getMetrics(organizationId) {
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
            tempoMedioGeracao: '4.2s',
            trends: {
                gerados: 12,
                downloads: 8,
                tempo: -0.5,
            },
        };
    }
    async generateReport(data) {
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
        this.simulateReportGeneration(report.id);
        return {
            message: 'Relatório sendo gerado! Você será notificado quando estiver pronto.',
            reportId: report.id
        };
    }
    async simulateReportGeneration(reportId) {
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
    async downloadReport(id) {
        const report = await this.prisma.report.findUnique({ where: { id } });
        if (!report || report.status !== 'completed' || !report.filePath) {
            throw new Error('Relatório não disponível');
        }
        const fs = require('fs');
        if (fs.existsSync(report.filePath)) {
            await this.prisma.report.update({
                where: { id },
                data: { downloads: { increment: 1 } }
            });
            return fs.readFileSync(report.filePath);
        }
        else {
            return Buffer.from("Conteúdo do relatório expirado ou removido.", 'utf-8');
        }
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map