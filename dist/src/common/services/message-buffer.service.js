"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBufferService = void 0;
const common_1 = require("@nestjs/common");
let MessageBufferService = class MessageBufferService {
    buffers = new Map();
    timers = new Map();
    addMessage(conversationId, message) {
        if (!this.buffers.has(conversationId)) {
            this.buffers.set(conversationId, []);
        }
        this.buffers.get(conversationId).push(message);
        if (this.timers.has(conversationId)) {
            clearTimeout(this.timers.get(conversationId));
        }
        const timer = setTimeout(() => {
            this.flushBuffer(conversationId);
        }, 2000);
        this.timers.set(conversationId, timer);
    }
    flushBuffer(conversationId) {
        const messages = this.buffers.get(conversationId);
        if (!messages || messages.length === 0)
            return;
        const combinedContent = messages
            .map(m => m.content)
            .join('\n');
        console.log(`[Buffer] Flushing ${messages.length} messages for conversation ${conversationId}`);
        this.buffers.delete(conversationId);
        this.timers.delete(conversationId);
        return;
    }
    getBufferedMessages(conversationId) {
        return this.buffers.get(conversationId) || [];
    }
    clearBuffer(conversationId) {
        if (this.timers.has(conversationId)) {
            clearTimeout(this.timers.get(conversationId));
        }
        this.buffers.delete(conversationId);
        this.timers.delete(conversationId);
    }
};
exports.MessageBufferService = MessageBufferService;
exports.MessageBufferService = MessageBufferService = __decorate([
    (0, common_1.Injectable)()
], MessageBufferService);
//# sourceMappingURL=message-buffer.service.js.map