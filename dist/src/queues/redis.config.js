"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisEventHandlers = exports.redisConnection = void 0;
exports.validateRedisConfig = validateRedisConfig;
const dotenv = require("dotenv");
dotenv.config();
exports.redisConnection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const maxRetries = parseInt(process.env.BULLMQ_MAX_RETRIES || '3', 10);
        if (times > maxRetries) {
            console.error(`[Redis] ❌ Max retries (${maxRetries}) reached. Stopping retry.`);
            return null;
        }
        const delay = Math.min(times * 1000, 3000);
        console.warn(`[Redis] Retry attempt ${times}/${maxRetries} in ${delay}ms`);
        return delay;
    },
    connectTimeout: parseInt(process.env.BULLMQ_CONNECTION_TIMEOUT || '10000', 10),
    commandTimeout: parseInt(process.env.BULLMQ_COMMAND_TIMEOUT || '30000', 10),
    maxLoadingRetryTime: 3000,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    lazyConnect: false,
    keepAlive: 30000,
    family: 4,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
};
function validateRedisConfig() {
    const required = ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`[Redis] Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file.');
    }
    const host = process.env.REDIS_HOST;
    if (host !== '127.0.0.1' && host !== '::1') {
        console.warn(`[Redis] WARNING: Redis host is "${host}". ` +
            'For security, should be 127.0.0.1 (localhost only).');
    }
    console.log('[Redis] Configuration validated successfully');
    console.log(`[Redis] Connecting to ${host}:${process.env.REDIS_PORT}`);
}
exports.redisEventHandlers = {
    onConnect: () => {
        console.log('[Redis] Connected successfully');
    },
    onReady: () => {
        console.log('[Redis] Ready to accept commands');
    },
    onError: (error) => {
        console.error('[Redis] Connection error:', error.message);
    },
    onClose: () => {
        console.warn('[Redis] Connection closed');
    },
    onReconnecting: () => {
        console.log('[Redis] Attempting to reconnect...');
    },
    onEnd: () => {
        console.error('[Redis] Connection ended permanently');
    },
};
//# sourceMappingURL=redis.config.js.map