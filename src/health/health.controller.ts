import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, DiskHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private memory: MemoryHealthIndicator,
        private disk: DiskHealthIndicator,
        private prisma: PrismaHealthIndicator,
        private redis: RedisHealthIndicator,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        // Detectar sistema operacional para path do disco
        const diskPath = process.platform === 'win32' ? 'C:/' : '/';

        return this.health.check([
            // Memória heap não deve exceder 300MB
            () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
            // Memória RSS não deve exceder 1GB
            () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
            // Disco deve ter pelo menos 10% livre (auto-detecta Windows/Linux)
            () => this.disk.checkStorage('storage', { path: diskPath, thresholdPercent: 0.9 }),
            // Database deve estar respondendo
            () => this.prisma.isHealthy('database'),
            // Redis deve estar respondendo
            () => this.redis.isHealthy('redis'),
        ]);
    }
}
