import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { OpenAIService } from './services/openai.service';
import { MediaAnalysisService } from './services/media-analysis.service';
import { MessageEventEmitter } from '../common/events/message-event.emitter';

@Module({
    controllers: [AIController],
    providers: [
        AIService,
        OpenAIService,
        MediaAnalysisService,
        MessageEventEmitter,
    ],
    exports: [AIService, OpenAIService, MediaAnalysisService, MessageEventEmitter],
})
export class AIModule { }
