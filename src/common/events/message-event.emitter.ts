import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';

@Injectable()
export class MessageEventEmitter extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100); // Increase for multiple conversations
    }

    emitMessage(conversationId: string, data: any) {
        this.emit(conversationId, data);
    }

    onMessage(conversationId: string, callback: (data: any) => void) {
        this.on(conversationId, callback);
    }

    offMessage(conversationId: string, callback: (data: any) => void) {
        this.off(conversationId, callback);
    }
}
