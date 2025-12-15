import { Module } from '@nestjs/common';
import { TestAIController } from './test-ai.controller';
import { TestAIService } from './test-ai.service';

@Module({
    controllers: [TestAIController],
    providers: [TestAIService],
    exports: [TestAIService],
})
export class TestAIModule { }
