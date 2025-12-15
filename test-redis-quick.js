// Test Redis connection from backend
require('dotenv').config({ path: '.env' });

const Redis = require('ioredis');

console.log('Testing Redis connection...');
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('REDIS_PORT:', process.env.REDIS_PORT);
console.log('REDIS_PASSWORD:', process.env.REDIS_PASSWORD);
console.log('Password length:', process.env.REDIS_PASSWORD?.length);
console.log('Has quotes:', process.env.REDIS_PASSWORD?.startsWith('"'));

const redis = new Redis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    connectTimeout: 5000,
    retryStrategy: (times) => {
        if (times > 2) {
            console.log('Max retries reached');
            return null;
        }
        return times * 1000;
    }
});

redis.on('connect', () => console.log('✅ Connected'));
redis.on('ready', () => console.log('✅ Ready'));
redis.on('error', (err) => console.error('❌ Error:', err.message));

redis.ping().then(result => {
    console.log('✅ Ping result:', result);
    process.exit(0);
}).catch(err => {
    console.error('❌ Ping failed:', err.message);
    process.exit(1);
});
