import { EventEmitter } from 'events';
export declare class MessageEventEmitter extends EventEmitter {
    constructor();
    emitMessage(conversationId: string, data: any): void;
    onMessage(conversationId: string, callback: (data: any) => void): void;
    offMessage(conversationId: string, callback: (data: any) => void): void;
}
