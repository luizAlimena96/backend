"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const dotenv = require("dotenv");
dotenv.config();
const connection = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
};
async function testSimple() {
    console.log('🧪 Teste Simples do BullMQ\n');
    console.log('1️⃣ Criando queue...');
    const queue = new bullmq_1.Queue('simple-test', { connection });
    console.log('   ✅ Queue criada\n');
    console.log('2️⃣ Criando worker...');
    const worker = new bullmq_1.Worker('simple-test', async (job) => {
        console.log(`   🔄 Processando: ${job.data.message}`);
        return { success: true };
    }, { connection });
    console.log('   ✅ Worker criado\n');
    console.log('3️⃣ Adicionando job...');
    await queue.add('test', { message: 'Hello BullMQ!' });
    console.log('   ✅ Job adicionado\n');
    console.log('4️⃣ Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const counts = await queue.getJobCounts();
    console.log('5️⃣ Resultado:', counts);
    if (counts.completed > 0) {
        console.log('\n✅ SUCESSO! BullMQ está funcionando!\n');
    }
    else {
        console.log('\n❌ FALHA! Job não foi processado\n');
    }
    await worker.close();
    await queue.close();
    process.exit(0);
}
testSimple().catch(console.error);
//# sourceMappingURL=test-bullmq-simple.js.map