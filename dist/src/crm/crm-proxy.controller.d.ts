import { HttpService } from '@nestjs/axios';
export declare class CRMProxyController {
    private httpService;
    constructor(httpService: HttpService);
    proxyRequest(data: {
        url: string;
        method: string;
        headers: Record<string, string>;
        body?: any;
    }): Promise<any>;
}
