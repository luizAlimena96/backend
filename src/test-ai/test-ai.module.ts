import { Module } from '@nestjs/common';
import { TestAIController } from './test-ai.controller';
import { TestAIService } from './test-ai.service';
import { AIModule } from '../ai/ai.module';
import { PrismaService } from '../database/prisma.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
    imports: [AIModule, IntegrationsModule],
    controllers: [TestAIController],
    providers: [TestAIService, PrismaService],
    exports: [TestAIService],
})
export class TestAIModule { }
