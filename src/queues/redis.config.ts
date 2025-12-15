import { ConnectionOptions } from 'bullmq';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * CONFIGURAÇÃO SEGURA DE REDIS PARA PRODUÇÃO
 * 
 * CRÍTICO:
 * - Conexão EXPLÍCITA (sem auto-discovery)
 * - Localhost apenas (127.0.0.1)
 * - Retry limitado (evita loops)
 * - Timeouts curtos (falha rápido)
 * - Password obrigatório
 */

export const redisConnection: ConnectionOptions = {
    // ============================================
    // CONEXÃO EXPLÍCITA
    // ============================================
    host: process.env.REDIS_HOST || '127.0.0.1',
    // NUNCA usar 'localhost' ou auto-discovery

    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    // Porta explícita

    password: process.env.REDIS_PASSWORD,
    // OBRIGATÓRIO em produção

    db: parseInt(process.env.REDIS_DB || '0', 10),
    // Database explícito

    // ============================================
    // RETRY STRATEGY - EVITA LOOPS
    // ============================================
    maxRetriesPerRequest: null,
    // MUST be null for BullMQ (BullMQ manages retries internally)
    // O limite de tentativas é controlado pelo retryStrategy abaixo

    retryStrategy: (times: number) => {
        // Estratégia de retry LIMITADA (alinhada com lexa)
        const maxRetries = parseInt(process.env.BULLMQ_MAX_RETRIES || '3', 10);

        if (times > maxRetries) {
            // Após max retries, PARA e loga erro
            console.error(`[Redis] ❌ Max retries (${maxRetries}) reached. Stopping retry.`);
            return null; // null = para de tentar
        }

        // Delay progressivo: 1s, 2s, 3s
        const delay = Math.min(times * 1000, 3000);
        console.warn(`[Redis] Retry attempt ${times}/${maxRetries} in ${delay}ms`);
        return delay;
    },

    // ============================================
    // TIMEOUTS - FALHA RÁPIDO (alinhado com lexa)
    // ============================================
    connectTimeout: parseInt(process.env.BULLMQ_CONNECTION_TIMEOUT || '10000', 10),
    // 10s para conectar ou falha (alinhado com lexa)

    commandTimeout: parseInt(process.env.BULLMQ_COMMAND_TIMEOUT || '30000', 10),
    // 30s para comandos ou falha (alinhado com lexa)

    // ============================================
    // LIMITES DE CONEXÃO (para VM)
    // ============================================
    maxLoadingRetryTime: 3000,
    // Tempo máximo para carregar scripts Lua

    // Limita o pool de conexões para economizar recursos da VM
    // Nota: ioredis não tem maxConnections direto, mas podemos limitar via outros meios

    // ============================================
    // SEGURANÇA
    // ============================================
    enableReadyCheck: true,
    // Verifica se Redis está pronto antes de usar

    enableOfflineQueue: false,
    // CRÍTICO: Não enfileirar comandos offline
    // Evita acúmulo de comandos durante desconexão

    lazyConnect: false,
    // Conectar imediatamente (não lazy)

    // ============================================
    // PERFORMANCE
    // ============================================
    keepAlive: 30000,
    // Keep-alive a cada 30s

    family: 4,
    // IPv4 apenas (mais rápido que auto-detect)

    // ============================================
    // LOGGING
    // ============================================
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    // Stack trace apenas em dev
};

/**
 * Validação de configuração
 */
export function validateRedisConfig(): void {
    const required = ['REDIS_HOST', 'REDIS_PORT', 'REDIS_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `[Redis] Missing required environment variables: ${missing.join(', ')}\n` +
            'Please check your .env file.'
        );
    }

    // Validar que host é localhost
    const host = process.env.REDIS_HOST;
    if (host !== '127.0.0.1' && host !== '::1') {
        console.warn(
            `[Redis] WARNING: Redis host is "${host}". ` +
            'For security, should be 127.0.0.1 (localhost only).'
        );
    }

    console.log('[Redis] Configuration validated successfully');
    console.log(`[Redis] Connecting to ${host}:${process.env.REDIS_PORT}`);
}

/**
 * Event handlers para monitoramento
 */
export const redisEventHandlers = {
    onConnect: () => {
        console.log('[Redis] Connected successfully');
    },

    onReady: () => {
        console.log('[Redis] Ready to accept commands');
    },

    onError: (error: Error) => {
        console.error('[Redis] Connection error:', error.message);
        // NÃO tenta reconectar automaticamente
        // Deixa o retryStrategy lidar com isso
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
