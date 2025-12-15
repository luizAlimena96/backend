"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIModule = void 0;
const common_1 = require("@nestjs/common");
const ai_controller_1 = require("./ai.controller");
const ai_service_1 = require("./ai.service");
const openai_service_1 = require("./services/openai.service");
const media_analysis_service_1 = require("./services/media-analysis.service");
const knowledge_search_service_1 = require("./services/knowledge-search.service");
const message_event_emitter_1 = require("../common/events/message-event.emitter");
const fsm_engine_service_1 = require("./fsm-engine/fsm-engine.service");
const data_extractor_service_1 = require("./fsm-engine/services/data-extractor.service");
const state_decider_service_1 = require("./fsm-engine/services/state-decider.service");
const decision_validator_service_1 = require("./fsm-engine/services/decision-validator.service");
const message_buffer_service_1 = require("./fsm-engine/services/message-buffer.service");
const tools_handler_service_1 = require("./fsm-engine/services/tools-handler.service");
let AIModule = class AIModule {
};
exports.AIModule = AIModule;
exports.AIModule = AIModule = __decorate([
    (0, common_1.Module)({
        controllers: [ai_controller_1.AIController],
        providers: [
            ai_service_1.AIService,
            openai_service_1.OpenAIService,
            media_analysis_service_1.MediaAnalysisService,
            knowledge_search_service_1.KnowledgeSearchService,
            message_event_emitter_1.MessageEventEmitter,
            fsm_engine_service_1.FSMEngineService,
            data_extractor_service_1.DataExtractorService,
            state_decider_service_1.StateDeciderService,
            decision_validator_service_1.DecisionValidatorService,
            message_buffer_service_1.MessageBufferService,
            tools_handler_service_1.ToolsHandlerService,
        ],
        exports: [
            ai_service_1.AIService,
            openai_service_1.OpenAIService,
            media_analysis_service_1.MediaAnalysisService,
            knowledge_search_service_1.KnowledgeSearchService,
            message_event_emitter_1.MessageEventEmitter,
            fsm_engine_service_1.FSMEngineService,
            data_extractor_service_1.DataExtractorService,
            state_decider_service_1.StateDeciderService,
            decision_validator_service_1.DecisionValidatorService,
            message_buffer_service_1.MessageBufferService,
            tools_handler_service_1.ToolsHandlerService,
        ],
    })
], AIModule);
//# sourceMappingURL=ai.module.js.map