import { Injectable } from '@nestjs/common';

interface BufferedMessage {
    content: string;
    timestamp: Date;
    fromMe: boolean;
}

@Injectable()
export class MessageBufferService {
    private buffers: Map<string, BufferedMessage[]> = new Map();
    private timers: Map<string, NodeJS.Timeout> = new Map();

    addMessage(conversationId: string, message: BufferedMessage): void {
        if (!this.buffers.has(conversationId)) {
            this.buffers.set(conversationId, []);
        }

        this.buffers.get(conversationId)!.push(message);

        // Clear existing timer
        if (this.timers.has(conversationId)) {
            clearTimeout(this.timers.get(conversationId)!);
        }

        // Set new timer to flush after 2 seconds of inactivity
        const timer = setTimeout(() => {
            this.flushBuffer(conversationId);
        }, 2000);

        this.timers.set(conversationId, timer);
    }

    private flushBuffer(conversationId: string): void {
        const messages = this.buffers.get(conversationId);
        if (!messages || messages.length === 0) return;

        // Combine messages
        const combinedContent = messages
            .map(m => m.content)
            .join('\n');

        console.log(`[Buffer] Flushing ${messages.length} messages for conversation ${conversationId}`);

        // Clear buffer
        this.buffers.delete(conversationId);
        this.timers.delete(conversationId);

        // Return combined message for processing
        return;
    }

    getBufferedMessages(conversationId: string): BufferedMessage[] {
        return this.buffers.get(conversationId) || [];
    }

    clearBuffer(conversationId: string): void {
        if (this.timers.has(conversationId)) {
            clearTimeout(this.timers.get(conversationId)!);
        }
        this.buffers.delete(conversationId);
        this.timers.delete(conversationId);
    }
}
