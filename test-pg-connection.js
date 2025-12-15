const { Client } = require('pg');

const client = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'lexa',
    password: 'lexapassword123',
    database: 'lexa',
});

async function test() {
    try {
        await client.connect();
        console.log('✅ Conectado com sucesso!');

        const res = await client.query('SELECT current_user, current_database(), version()');
        console.log('📊 Resultado:', res.rows[0]);

        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro:', err.message);
        console.error('Detalhes:', err);
        process.exit(1);
    }
}

test();
