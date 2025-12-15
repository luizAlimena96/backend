import { HttpService } from '@nestjs/axios';
export declare class ZapSignService {
    private httpService;
    constructor(httpService: HttpService);
    createDocument(apiToken: string, templateId: string, data: any): Promise<any>;
    getDocumentStatus(apiToken: string, documentId: string): Promise<any>;
}
