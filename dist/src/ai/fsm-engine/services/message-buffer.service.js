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
    messageQueues = new Map();
    processingTimers = new Map();
    addMessageToBuffer(conversationId, messageId, agentId, message, bufferConfig, onProcess) {
        if (!bufferConfig.enabled) {
            const item = {
                messageId,
                conversationId,
                agentId,
                message,
                receivedAt: new Date(),
                scheduledFor: new Date(),
                status: 'pending',
            };
            onProcess([item]).catch(error => {
                console.error('[Message Buffer] Error processing immediate message:', error);
            });
            return;
        }
        const queueItem = {
            messageId,
            conversationId,
            agentId,
            message,
            receivedAt: new Date(),
            scheduledFor: new Date(Date.now() + bufferConfig.delayMs),
            status: 'pending',
        };
        const queue = this.messageQueues.get(conversationId) || [];
        queue.push(queueItem);
        this.messageQueues.set(conversationId, queue);
        console.log(`[Message Buffer] Added message to buffer for conversation ${conversationId}`, {
            queueSize: queue.length,
            delayMs: bufferConfig.delayMs,
            scheduledFor: queueItem.scheduledFor,
        });
        const existingTimer = this.processingTimers.get(conversationId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        const timer = setTimeout(async () => {
            await this.processQueue(conversationId, onProcess);
        }, bufferConfig.delayMs);
        this.processingTimers.set(conversationId, timer);
    }
    async processQueue(conversationId, onProcess) {
        const queue = this.messageQueues.get(conversationId);
        if (!queue || queue.length === 0) {
            return;
        }
        console.log(`[Message Buffer] Processing queue for conversation ${conversationId}`, {
            messageCount: queue.length,
        });
        queue.forEach(item => {
            item.status = 'processing';
        });
        try {
            await onProcess(queue);
            queue.forEach(item => {
                item.status = 'completed';
            });
            console.log(`[Message Buffer] Successfully processed ${queue.length} messages`);
        }
        catch (error) {
            console.error('[Message Buffer] Error processing queue:', error);
            queue.forEach(item => {
                item.status = 'failed';
            });
        }
        finally {
            this.messageQueues.delete(conversationId);
            this.processingTimers.delete(conversationId);
        }
    }
    clearBuffer(conversationId) {
        const timer = this.processingTimers.get(conversationId);
        if (timer) {
            clearTimeout(timer);
            this.processingTimers.delete(conversationId);
        }
        this.messageQueues.delete(conversationId);
        console.log(`[Message Buffer] Cleared buffer for conversation ${conversationId}`);
    }
    getBufferStatus(conversationId) {
        const queue = this.messageQueues.get(conversationId) || [];
        const hasTimer = this.processingTimers.has(conversationId);
        return {
            queueSize: queue.length,
            messages: queue,
            hasTimer,
        };
    }
    async flushBuffer(conversationId, onProcess) {
        const timer = this.processingTimers.get(conversationId);
        if (timer) {
            clearTimeout(timer);
            this.processingTimers.delete(conversationId);
        }
        await this.processQueue(conversationId, onProcess);
    }
    clearAllBuffers() {
        this.processingTimers.forEach(timer => clearTimeout(timer));
        this.processingTimers.clear();
        this.messageQueues.clear();
        console.log('[Message Buffer] Cleared all buffers');
    }
    getBufferStats() {
        let totalMessages = 0;
        this.messageQueues.forEach(queue => {
            totalMessages += queue.length;
        });
        return {
            totalConversations: this.messageQueues.size,
            totalQueuedMessages: totalMessages,
            activeTimers: this.processingTimers.size,
        };
    }
    onModuleDestroy() {
        this.clearAllBuffers();
    }
};
exports.MessageBufferService = MessageBufferService;
exports.MessageBufferService = MessageBufferService = __decorate([
    (0, common_1.Injectable)()
], MessageBufferService);
//# sourceMappingURL=message-buffer.service.js.map