"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisEventHandlers = exports.redisConnection = void 0;
exports.validateRedisConfig = validateRedisConfig;
const dotenv = __importStar(require("dotenv"));
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
    commandTimeout: parseInt(process.env.BULLMQ_COMMAND_TIMEOUT || '120000', 10),
    maxLoadingRetryTime: 3000,
    enableReadyCheck: true,
    enableOfflineQueue: true,
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