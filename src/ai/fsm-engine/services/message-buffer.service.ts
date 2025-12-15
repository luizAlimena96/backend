import { Injectable, OnModuleDestroy } from '@nestjs/common';

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

/**
 * Message Buffer Service
 * Groups rapid messages together to process in batch
 * Prevents spam and improves AI context
 */
@Injectable()
export class MessageBufferService implements OnModuleDestroy {
    private messageQueues = new Map<string, MessageQueueItem[]>();
    private processingTimers = new Map<string, NodeJS.Timeout>();

    /**
     * Add message to buffer
     */
    addMessageToBuffer(
        conversationId: string,
        messageId: string,
        agentId: string,
        message: string,
        bufferConfig: BufferConfig,
        onProcess: (messages: MessageQueueItem[]) => Promise<void>
    ): void {
        // If buffer disabled, process immediately
        if (!bufferConfig.enabled) {
            const item: MessageQueueItem = {
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

        // Create queue item
        const queueItem: MessageQueueItem = {
            messageId,
            conversationId,
            agentId,
            message,
            receivedAt: new Date(),
            scheduledFor: new Date(Date.now() + bufferConfig.delayMs),
            status: 'pending',
        };

        // Add to queue
        const queue = this.messageQueues.get(conversationId) || [];
        queue.push(queueItem);
        this.messageQueues.set(conversationId, queue);

        console.log(`[Message Buffer] Added message to buffer for conversation ${conversationId}`, {
            queueSize: queue.length,
            delayMs: bufferConfig.delayMs,
            scheduledFor: queueItem.scheduledFor,
        });

        // Cancel existing timer
        const existingTimer = this.processingTimers.get(conversationId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Create new timer
        const timer = setTimeout(async () => {
            await this.processQueue(conversationId, onProcess);
        }, bufferConfig.delayMs);

        this.processingTimers.set(conversationId, timer);
    }

    /**
     * Process queue
     */
    private async processQueue(
        conversationId: string,
        onProcess: (messages: MessageQueueItem[]) => Promise<void>
    ): Promise<void> {
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
        } catch (error) {
            console.error('[Message Buffer] Error processing queue:', error);

            queue.forEach(item => {
                item.status = 'failed';
            });
        } finally {
            this.messageQueues.delete(conversationId);
            this.processingTimers.delete(conversationId);
        }
    }

    /**
     * Clear buffer for specific conversation
     */
    clearBuffer(conversationId: string): void {
        const timer = this.processingTimers.get(conversationId);
        if (timer) {
            clearTimeout(timer);
            this.processingTimers.delete(conversationId);
        }

        this.messageQueues.delete(conversationId);

        console.log(`[Message Buffer] Cleared buffer for conversation ${conversationId}`);
    }

    /**
     * Get buffer status
     */
    getBufferStatus(conversationId: string): {
        queueSize: number;
        messages: MessageQueueItem[];
        hasTimer: boolean;
    } {
        const queue = this.messageQueues.get(conversationId) || [];
        const hasTimer = this.processingTimers.has(conversationId);

        return {
            queueSize: queue.length,
            messages: queue,
            hasTimer,
        };
    }

    /**
     * Flush buffer (force immediate processing)
     */
    async flushBuffer(
        conversationId: string,
        onProcess: (messages: MessageQueueItem[]) => Promise<void>
    ): Promise<void> {
        const timer = this.processingTimers.get(conversationId);
        if (timer) {
            clearTimeout(timer);
            this.processingTimers.delete(conversationId);
        }

        await this.processQueue(conversationId, onProcess);
    }

    /**
     * Clear all buffers
     */
    clearAllBuffers(): void {
        this.processingTimers.forEach(timer => clearTimeout(timer));
        this.processingTimers.clear();
        this.messageQueues.clear();

        console.log('[Message Buffer] Cleared all buffers');
    }

    /**
     * Get global stats
     */
    getBufferStats(): {
        totalConversations: number;
        totalQueuedMessages: number;
        activeTimers: number;
    } {
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

    /**
     * Cleanup on module destroy
     */
    onModuleDestroy() {
        this.clearAllBuffers();
    }
}
