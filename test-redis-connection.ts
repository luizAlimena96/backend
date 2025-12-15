/**
 * TESTE DE CONEXÃO REDIS
 * Usa IORedis (já instalado via BullMQ)
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

async function testRedisConnection() {
    console.log('🔌 Testando conexão com Redis...\n');

    const client = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
            if (times > 3) {
                console.error('❌ Falha após 3 tentativas');
                return null;
            }
            return Math.min(times * 1000, 3000);
        },
    });

    client.on('error', (err) => {
        console.error('❌ Erro Redis:', err.message);
    });

    client.on('connect', () => {
        console.log('🔗 Conectando ao Redis...');
    });

    client.on('ready', () => {
        console.log('✅ Redis pronto!\n');
    });

    try {
        // Teste PING
        console.log('📡 Testando PING...');
        const pong = await client.ping();
        console.log(`   Resposta: ${pong}\n`);

        // Teste SET/GET
        console.log('📝 Testando SET/GET...');
        await client.set('test-key', 'Hello Redis!');
        const value = await client.get('test-key');
        console.log(`   Valor: ${value}\n`);

        // Info
        console.log('ℹ️  Info do servidor:');
        const info = await client.info('server');
        const lines = info.split('\n').slice(0, 5);
        lines.forEach(line => {
            if (line.trim()) console.log(`   ${line}`);
        });

        console.log('\n✅ Redis está funcionando perfeitamente!\n');

        await client.quit();
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Erro:', error.message);
        await client.quit();
        process.exit(1);
    }
}

testRedisConnection();
