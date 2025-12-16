import { Module } from '@nestjs/common';
import { TestAIController } from './test-ai.controller';
import { TestAIService } from './test-ai.service';
import { AIModule } from '../ai/ai.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { FollowupsModule } from '../followups/followups.module';
import { LeadsModule } from '../leads/leads.module';
import { CommonModule } from '../common/common.module';
import { PrismaService } from '../database/prisma.service';

@Module({
    imports: [
        AIModule,
        IntegrationsModule,
        FollowupsModule,
        LeadsModule,
        CommonModule,
    ],
    controllers: [TestAIController],
    providers: [TestAIService, PrismaService],
    exports: [TestAIService],
})
export class TestAIModule { }
