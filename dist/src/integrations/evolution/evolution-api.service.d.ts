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
    sendImage(instanceName: string, to: string, imageUrl: string, caption?: string): Promise<any>;
    sendVideo(instanceName: string, to: string, videoUrl: string, caption?: string): Promise<any>;
    sendDocument(instanceName: string, to: string, documentUrl: string, fileName?: string, caption?: string): Promise<any>;
    sendAudio(instanceName: string, to: string, audioUrl: string): Promise<any>;
    getInstanceStatus(instanceName: string): Promise<any>;
}
