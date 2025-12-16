import { Response } from 'express';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    getReports(queryOrgId: string, req: any): Promise<import("./reports.service").Report[]>;
    getMetrics(queryOrgId: string, req: any): Promise<import("./reports.service").ReportMetrics>;
    generateReport(data: any, req: any): Promise<{
        message: string;
        reportId?: string;
    }>;
    downloadReport(id: string, res: Response): Promise<void>;
}
