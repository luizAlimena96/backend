import { OnModuleDestroy } from '@nestjs/common';
export interface BufferConfig {
    enabled: boolean;
    delayMs: number;
}
export interface MessageQueueItem {
    messageId: string;
    conversationId: string;
    agentId: string;
    message: string;
    receivedAt: Date;
    scheduledFor: Date;
    status: 'pending' | 'processing' | 'completed' | 'failed';
}
export declare class MessageBufferService implements OnModuleDestroy {
    private messageQueues;
    private processingTimers;
    addMessageToBuffer(conversationId: string, messageId: string, agentId: string, message: string, bufferConfig: BufferConfig, onProcess: (messages: MessageQueueItem[]) => Promise<void>): void;
    private processQueue;
    clearBuffer(conversationId: string): void;
    getBufferStatus(conversationId: string): {
        queueSize: number;
        messages: MessageQueueItem[];
        hasTimer: boolean;
    };
    flushBuffer(conversationId: string, onProcess: (messages: MessageQueueItem[]) => Promise<void>): Promise<void>;
    clearAllBuffers(): void;
    getBufferStats(): {
        totalConversations: number;
        totalQueuedMessages: number;
        activeTimers: number;
    };
    onModuleDestroy(): void;
}
