import { HttpService } from '@nestjs/axios';
export declare class CRMIntegrationService {
    private httpService;
    constructor(httpService: HttpService);
    syncLead(leadData: any, crmConfig: any): Promise<any>;
    updateDeal(dealId: string, data: any, crmConfig: any): Promise<any>;
}
