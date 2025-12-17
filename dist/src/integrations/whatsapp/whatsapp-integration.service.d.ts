import { EvolutionAPIService } from '../evolution/evolution-api.service';
export declare class WhatsAppIntegrationService {
    private evolutionAPI;
    constructor(evolutionAPI: EvolutionAPIService);
    sendMessage(instanceName: string, to: string, message: string): Promise<any>;
    sendMedia(instanceName: string, to: string, mediaUrl: string, caption?: string): Promise<any>;
    getInstanceStatus(instanceName: string): Promise<any>;
    createInstance(instanceName: string): Promise<any>;
    getQRCode(instanceName: string): Promise<string>;
    sendImage(instanceName: string, to: string, imageUrl: string, caption?: string): Promise<any>;
    sendVideo(instanceName: string, to: string, videoUrl: string, caption?: string): Promise<any>;
    sendDocument(instanceName: string, to: string, documentUrl: string, fileName?: string, caption?: string): Promise<any>;
    sendAudio(instanceName: string, to: string, audioUrl: string): Promise<any>;
}
