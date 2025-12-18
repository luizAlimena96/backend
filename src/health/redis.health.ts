import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
    private redis: Redis;

    constructor() {
        super();
        this.redis = new Redis({
            host: process.env.REDIS_HOST || '127.0.0.1',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0', 10),
        });
    }

    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            const result = await this.redis.ping();
            if (result === 'PONG') {
                return this.getStatus(key, true);
            }
            throw new Error('Redis did not respond with PONG');
        } catch (error) {
            throw new HealthCheckError('Redis check failed', this.getStatus(key, false));
        }
    }
}
