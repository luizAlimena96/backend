import { BufferConfig, MessageQueueItem } from './types';
export declare function addMessageToBuffer(conversationId: string, messageId: string, agentId: string, message: string, bufferConfig: BufferConfig, onProcess: (messages: MessageQueueItem[]) => Promise<void>): void;
export declare function clearBuffer(conversationId: string): void;
export declare function getBufferStatus(conversationId: string): {
    queueSize: number;
    messages: MessageQueueItem[];
    hasTimer: boolean;
};
export declare function flushBuffer(conversationId: string, onProcess: (messages: MessageQueueItem[]) => Promise<void>): Promise<void>;
export declare function clearAllBuffers(): void;
export declare function getBufferStats(): {
    totalConversations: number;
    totalQueuedMessages: number;
    activeTimers: number;
};
