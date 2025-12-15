import { ReportsService } from './reports.service';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    getReports(organizationId?: string): Promise<import("./reports.service").Report[]>;
    getMetrics(organizationId?: string): Promise<import("./reports.service").ReportMetrics>;
    generateReport(data: any): Promise<{
        message: string;
        reportId?: string;
    }>;
    downloadReport(id: string): Promise<Buffer<ArrayBufferLike>>;
}
