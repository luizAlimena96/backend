interface BufferedMessage {
    content: string;
    timestamp: Date;
    fromMe: boolean;
}
export declare class MessageBufferService {
    private buffers;
    private timers;
    addMessage(conversationId: string, message: BufferedMessage): void;
    private flushBuffer;
    getBufferedMessages(conversationId: string): BufferedMessage[];
    clearBuffer(conversationId: string): void;
}
export {};
