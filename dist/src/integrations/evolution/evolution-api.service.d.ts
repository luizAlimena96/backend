import { HttpService } from '@nestjs/axios';
export declare class EvolutionAPIService {
    private httpService;
    constructor(httpService: HttpService);
    private getBaseUrl;
    private getApiKey;
    createInstance(instanceName: string): Promise<any>;
    getQRCode(instanceName: string): Promise<string>;
    sendMessage(instanceName: string, to: string, message: string): Promise<any>;
    sendMedia(instanceName: string, to: string, mediaUrl: string, caption?: string): Promise<any>;
    getInstanceStatus(instanceName: string): Promise<any>;
}
