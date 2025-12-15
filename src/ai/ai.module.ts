import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { OpenAIService } from './services/openai.service';
import { MediaAnalysisService } from './services/media-analysis.service';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { MessageEventEmitter } from '../common/events/message-event.emitter';
import { FSMEngineService } from './fsm-engine/fsm-engine.service';
import { DataExtractorService } from './fsm-engine/services/data-extractor.service';
import { StateDeciderService } from './fsm-engine/services/state-decider.service';
import { DecisionValidatorService } from './fsm-engine/services/decision-validator.service';
import { MessageBufferService } from './fsm-engine/services/message-buffer.service';
import { ToolsHandlerService } from './fsm-engine/services/tools-handler.service';

@Module({
    controllers: [AIController],
    providers: [
        AIService,
        OpenAIService,
        MediaAnalysisService,
        KnowledgeSearchService,
        MessageEventEmitter,
        FSMEngineService,
        DataExtractorService,
        StateDeciderService,
        DecisionValidatorService,
        MessageBufferService,
        ToolsHandlerService,
    ],
    exports: [
        AIService,
        OpenAIService,
        MediaAnalysisService,
        KnowledgeSearchService,
        MessageEventEmitter,
        FSMEngineService,
        DataExtractorService,
        StateDeciderService,
        DecisionValidatorService,
        MessageBufferService,
        ToolsHandlerService,
    ],
})
export class AIModule { }
