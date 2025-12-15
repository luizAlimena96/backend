import { Injectable } from '@nestjs/common';

@Injectable()
export class MessageProcessingService {
    async processIncomingMessage(message: any): Promise<any> {
        console.log('[Message Processing] Processing:', message);

        // Extract message data
        const { from, content, type } = message;

        // Process based on type
        if (type === 'text') {
            return this.processTextMessage(from, content);
        } else if (type === 'audio') {
            return this.processAudioMessage(from, content);
        }

        return { processed: true };
    }

    private async processTextMessage(from: string, content: string): Promise<any> {
        console.log(`Processing text from ${from}: ${content}`);
        return { type: 'text', processed: true };
    }

    private async processAudioMessage(from: string, content: string): Promise<any> {
        console.log(`Processing audio from ${from}`);
        return { type: 'audio', processed: true };
    }
}
