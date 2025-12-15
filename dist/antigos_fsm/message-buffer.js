"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMessageToBuffer = addMessageToBuffer;
exports.clearBuffer = clearBuffer;
exports.getBufferStatus = getBufferStatus;
exports.flushBuffer = flushBuffer;
exports.clearAllBuffers = clearAllBuffers;
exports.getBufferStats = getBufferStats;
const messageQueues = new Map();
const processingTimers = new Map();
function addMessageToBuffer(conversationId, messageId, agentId, message, bufferConfig, onProcess) {
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
    const queue = messageQueues.get(conversationId) || [];
    queue.push(queueItem);
    messageQueues.set(conversationId, queue);
    console.log(`[Message Buffer] Added message to buffer for conversation ${conversationId}`, {
        queueSize: queue.length,
        delayMs: bufferConfig.delayMs,
        scheduledFor: queueItem.scheduledFor,
    });
    const existingTimer = processingTimers.get(conversationId);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }
    const timer = setTimeout(async () => {
        await processQueue(conversationId, onProcess);
    }, bufferConfig.delayMs);
    processingTimers.set(conversationId, timer);
}
async function processQueue(conversationId, onProcess) {
    const queue = messageQueues.get(conversationId);
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
        messageQueues.delete(conversationId);
        processingTimers.delete(conversationId);
    }
}
function clearBuffer(conversationId) {
    const timer = processingTimers.get(conversationId);
    if (timer) {
        clearTimeout(timer);
        processingTimers.delete(conversationId);
    }
    messageQueues.delete(conversationId);
    console.log(`[Message Buffer] Cleared buffer for conversation ${conversationId}`);
}
function getBufferStatus(conversationId) {
    const queue = messageQueues.get(conversationId) || [];
    const hasTimer = processingTimers.has(conversationId);
    return {
        queueSize: queue.length,
        messages: queue,
        hasTimer,
    };
}
async function flushBuffer(conversationId, onProcess) {
    const timer = processingTimers.get(conversationId);
    if (timer) {
        clearTimeout(timer);
        processingTimers.delete(conversationId);
    }
    await processQueue(conversationId, onProcess);
}
function clearAllBuffers() {
    processingTimers.forEach(timer => clearTimeout(timer));
    processingTimers.clear();
    messageQueues.clear();
    console.log('[Message Buffer] Cleared all buffers');
}
function getBufferStats() {
    let totalMessages = 0;
    messageQueues.forEach(queue => {
        totalMessages += queue.length;
    });
    return {
        totalConversations: messageQueues.size,
        totalQueuedMessages: totalMessages,
        activeTimers: processingTimers.size,
    };
}
//# sourceMappingURL=message-buffer.js.map