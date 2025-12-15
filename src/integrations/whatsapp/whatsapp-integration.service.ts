import { Injectable } from '@nestjs/common';
import { EvolutionAPIService } from '../evolution/evolution-api.service';

@Injectable()
export class WhatsAppIntegrationService {
    constructor(private evolutionAPI: EvolutionAPIService) { }

    async sendMessage(instanceName: string, to: string, message: string): Promise<any> {
        return this.evolutionAPI.sendMessage(instanceName, to, message);
    }

    async sendMedia(instanceName: string, to: string, mediaUrl: string, caption?: string): Promise<any> {
        return this.evolutionAPI.sendMedia(instanceName, to, mediaUrl, caption);
    }

    async getInstanceStatus(instanceName: string): Promise<any> {
        return this.evolutionAPI.getInstanceStatus(instanceName);
    }

    async createInstance(instanceName: string): Promise<any> {
        return this.evolutionAPI.createInstance(instanceName);
    }

    async getQRCode(instanceName: string): Promise<string> {
        return this.evolutionAPI.getQRCode(instanceName);
    }
}
