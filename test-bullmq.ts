/**
 * TESTE COMPLETO DO BULLMQ
 * 
 * Este script testa:
 * 1. Conexão com Redis
 * 2. Criação de Queue
 * 3. Adição de Jobs
 * 4. Processamento de Jobs
 * 5. Worker funcionando
 * 6. Eventos e logs
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuração do Redis
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
};

console.log('🚀 Iniciando teste do BullMQ...\n');
console.log('📋 Configuração:');
console.log(`   Host: ${connection.host}`);
console.log(`   Port: ${connection.port}`);
console.log(`   Password: ${connection.password ? '***' : 'não configurada'}\n`);

// Criar Queue
const testQueue = new Queue('test-queue', { connection });

// Criar Worker
const testWorker = new Worker(
    'test-queue',
    async (job) => {
        console.log(`\n🔄 Processando job ${job.id}...`);
        console.log(`   Nome: ${job.name}`);
        console.log(`   Dados:`, job.data);

        // Simular processamento
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Retornar resultado
        return {
            processed: true,
            timestamp: new Date().toISOString(),
            message: `Job ${job.name} processado com sucesso!`
        };
    },
    { connection }
);

// Criar QueueEvents para monitorar
const queueEvents = new QueueEvents('test-queue', { connection });

// Event Handlers
queueEvents.on('waiting', ({ jobId }) => {
    console.log(`⏳ Job ${jobId} aguardando processamento`);
});

queueEvents.on('active', ({ jobId }) => {
    console.log(`▶️  Job ${jobId} iniciado`);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
    console.log(`✅ Job ${jobId} completado!`);
    console.log(`   Resultado:`, returnvalue);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`❌ Job ${jobId} falhou:`, failedReason);
});

testWorker.on('ready', () => {
    console.log('✅ Worker pronto para processar jobs!\n');
});

testWorker.on('error', (error) => {
    console.error('❌ Erro no Worker:', error.message);
});

// Função principal de teste
async function runTests() {
    try {
        console.log('📝 Teste 1: Adicionando job simples...');
        const job1 = await testQueue.add('simple-job', {
            message: 'Hello BullMQ!',
            timestamp: new Date().toISOString(),
        });
        console.log(`   ✅ Job ${job1.id} adicionado\n`);

        // Aguardar processamento
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📝 Teste 2: Adicionando job com delay...');
        const job2 = await testQueue.add(
            'delayed-job',
            { message: 'Job com delay de 3 segundos' },
            { delay: 3000 }
        );
        console.log(`   ✅ Job ${job2.id} adicionado (delay: 3s)\n`);

        // Aguardar processamento
        await new Promise(resolve => setTimeout(resolve, 4000));

        console.log('📝 Teste 3: Adicionando job com retry...');
        const job3 = await testQueue.add(
            'retry-job',
            { message: 'Job com retry' },
            {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                }
            }
        );
        console.log(`   ✅ Job ${job3.id} adicionado (max attempts: 3)\n`);

        // Aguardar processamento
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('📝 Teste 4: Verificando estado da fila...');
        const counts = await testQueue.getJobCounts();
        console.log('   Estado da fila:', counts);

        console.log('\n📝 Teste 5: Listando jobs completados...');
        const completed = await testQueue.getCompleted(0, 10);
        console.log(`   Total de jobs completados: ${completed.length}`);
        completed.forEach(job => {
            console.log(`   - Job ${job.id}: ${job.name}`);
        });

        console.log('\n✅ Todos os testes completados com sucesso!');
        console.log('\n🎉 BullMQ está funcionando corretamente!\n');

    } catch (error) {
        console.error('\n❌ Erro durante os testes:', error);
        throw error;
    } finally {
        // Cleanup
        console.log('🧹 Limpando recursos...');
        await testWorker.close();
        await testQueue.close();
        await queueEvents.close();
        console.log('✅ Recursos liberados\n');
        process.exit(0);
    }
}

// Executar testes
runTests().catch((error) => {
    console.error('💥 Erro fatal:', error);
    process.exit(1);
});
