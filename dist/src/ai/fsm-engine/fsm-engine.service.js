"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FSMEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
const openai_service_1 = require("../services/openai.service");
const knowledge_search_service_1 = require("../services/knowledge-search.service");
const data_extractor_service_1 = require("./services/data-extractor.service");
const state_decider_service_1 = require("./services/state-decider.service");
const decision_validator_service_1 = require("./services/decision-validator.service");
let FSMEngineService = class FSMEngineService {
    prisma;
    openaiService;
    knowledgeSearch;
    dataExtractor;
    stateDecider;
    decisionValidator;
    constructor(prisma, openaiService, knowledgeSearch, dataExtractor, stateDecider, decisionValidator) {
        this.prisma = prisma;
        this.openaiService = openaiService;
        this.knowledgeSearch = knowledgeSearch;
        this.dataExtractor = dataExtractor;
        this.stateDecider = stateDecider;
        this.decisionValidator = decisionValidator;
    }
    async decideNextState(input) {
        const startTime = Date.now();
        const metrics = {
            extractionTime: 0,
            knowledgeSearchTime: 0,
            decisionTime: 0,
            validationTime: 0,
            totalTime: 0,
        };
        try {
            console.log('[FSM Engine] Starting 3-AI decision process', {
                agentId: input.agentId,
                currentState: input.currentState,
            });
            const agent = await this.prisma.agent.findUnique({
                where: { id: input.agentId },
                select: {
                    id: true,
                    name: true,
                    personality: true,
                    tone: true,
                    systemPrompt: true,
                    instructions: true,
                    writingStyle: true,
                    prohibitions: true,
                    fsmDataExtractorPrompt: true,
                    fsmStateDeciderPrompt: true,
                    fsmValidatorPrompt: true,
                    states: {
                        orderBy: { order: 'asc' },
                    },
                    knowledge: true,
                    organization: {
                        select: {
                            openaiApiKey: true,
                            openaiModel: true,
                            workingHours: true,
                        },
                    },
                },
            });
            if (!agent || !agent.organization.openaiApiKey) {
                throw new Error('Agent not found or OpenAI API key not configured');
            }
            console.log('[FSM Engine] DEBUG - Agent Prompts:', {
                agentId: agent.id,
                agentName: agent.name,
                hasDataExtractor: !!agent.fsmDataExtractorPrompt,
                hasStateDecider: !!agent.fsmStateDeciderPrompt,
                hasValidator: !!agent.fsmValidatorPrompt,
                dataExtractorLength: agent.fsmDataExtractorPrompt?.length || 0,
                stateDeciderLength: agent.fsmStateDeciderPrompt?.length || 0,
                validatorLength: agent.fsmValidatorPrompt?.length || 0,
            });
            const apiKey = agent.organization.openaiApiKey;
            const model = agent.organization.openaiModel || 'gpt-4o-mini';
            const agentContext = {
                name: agent.name,
                personality: agent.personality,
                tone: agent.tone,
                systemPrompt: agent.systemPrompt,
                instructions: agent.instructions,
                writingStyle: agent.writingStyle,
                prohibitions: agent.prohibitions,
                workingHours: agent.organization.workingHours || null,
            };
            const currentState = agent.states.find(s => s.name === input.currentState);
            if (!currentState) {
                throw new Error(`Estado '${input.currentState}' não encontrado`);
            }
            const routes = currentState.availableRoutes;
            const extractionStart = Date.now();
            const allDataKeys = agent.states
                .filter(s => s.dataKey && s.dataKey !== 'vazio')
                .map(s => ({
                key: s.dataKey,
                description: s.dataDescription || '',
                type: s.dataType || 'string',
            }));
            const globalExtraction = await this.dataExtractor.extractAllDataFromMessage({
                message: input.lastMessage,
                allDataKeys,
                currentExtractedData: input.extractedData,
                conversationHistory: input.conversationHistory,
                agentContext,
            }, apiKey, model, agent.fsmDataExtractorPrompt);
            let updatedExtractedData = {
                ...input.extractedData,
                ...globalExtraction.extractedData,
            };
            const specificExtraction = await this.dataExtractor.extractDataFromMessage({
                message: input.lastMessage,
                dataKey: currentState.dataKey,
                dataType: currentState.dataType,
                dataDescription: currentState.dataDescription,
                currentExtractedData: updatedExtractedData,
                conversationHistory: input.conversationHistory,
                agentContext,
            }, apiKey, model, agent.fsmDataExtractorPrompt);
            updatedExtractedData = specificExtraction.data;
            metrics.extractionTime = Date.now() - extractionStart;
            console.log('[FSM Engine] IA 1 (Data Extractor) completed', {
                globalFields: globalExtraction.metadata.extractedFields,
                specificFields: specificExtraction.metadata.extractedFields,
            });
            if (input.leadId && Object.keys(globalExtraction.extractedData).length > 0) {
                await this.prisma.lead.update({
                    where: { id: input.leadId },
                    data: { extractedData: updatedExtractedData },
                });
            }
            const knowledgeStart = Date.now();
            let knowledgeContext = '';
            const knowledgeInfo = {
                searched: false,
                chunksFound: 0,
                topSimilarity: 0,
                chunksTotal: 0,
                chunksWithEmbeddings: 0,
            };
            try {
                console.log('[FSM Engine] Searching knowledge base...');
                const stats = await this.knowledgeSearch.getKnowledgeStats(input.agentId, input.organizationId);
                knowledgeInfo.chunksTotal = stats.totalChunks;
                knowledgeInfo.chunksWithEmbeddings = stats.chunksWithEmbeddings;
                knowledgeInfo.searched = true;
                const searchResults = await this.knowledgeSearch.searchKnowledge(input.lastMessage, input.agentId, input.organizationId, apiKey, { topK: 50, minSimilarity: 0.5 });
                knowledgeInfo.chunksFound = searchResults.length;
                if (searchResults.length > 0) {
                    knowledgeInfo.topSimilarity = searchResults[0].similarity;
                    knowledgeContext = this.knowledgeSearch.formatKnowledgeContext(searchResults);
                    console.log(`[FSM Engine] Knowledge context added (${knowledgeContext.length} chars)`);
                }
                else {
                    console.log('[FSM Engine] No relevant knowledge found');
                }
            }
            catch (knowledgeError) {
                console.error('[FSM Engine] Knowledge search failed:', knowledgeError);
            }
            metrics.knowledgeSearchTime = Date.now() - knowledgeStart;
            const decisionStart = Date.now();
            console.log('[FSM Engine] 🔍 DEBUG - Before State Decider:', {
                hasCustomPrompt: !!agent.fsmStateDeciderPrompt,
                promptLength: agent.fsmStateDeciderPrompt?.length || 0,
                promptPreview: agent.fsmStateDeciderPrompt?.substring(0, 100) || 'NULL',
            });
            const decisionResult = await this.stateDecider.decideStateTransition({
                currentState: currentState.name,
                missionPrompt: currentState.missionPrompt,
                dataKey: currentState.dataKey,
                extractedData: updatedExtractedData,
                lastMessage: input.lastMessage,
                conversationHistory: input.conversationHistory,
                availableRoutes: routes,
                prohibitions: currentState.prohibitions,
                agentContext,
                knowledgeContext,
            }, apiKey, model, agent.fsmStateDeciderPrompt);
            metrics.decisionTime = Date.now() - decisionStart;
            console.log('[FSM Engine] IA 2 (State Decider) completed', {
                nextState: decisionResult.estado_escolhido,
                veredito: decisionResult.veredito,
                rota: decisionResult.rota_escolhida,
            });
            const rulesValidation = this.stateDecider.validateDecisionRules(decisionResult, {
                currentState: currentState.name,
                missionPrompt: currentState.missionPrompt,
                dataKey: currentState.dataKey,
                extractedData: updatedExtractedData,
                lastMessage: input.lastMessage,
                conversationHistory: input.conversationHistory,
                availableRoutes: routes,
                prohibitions: currentState.prohibitions,
            });
            if (!rulesValidation.valid) {
                console.warn('[FSM Engine] Decision rules violated:', rulesValidation.errors);
                decisionResult.pensamento.push('⚠️ AVISO: Regras do motor violadas:', ...rulesValidation.errors);
            }
            const validationStart = Date.now();
            const validationResult = await this.decisionValidator.validateDecision({
                currentState: currentState.name,
                proposedNextState: decisionResult.estado_escolhido,
                decision: decisionResult,
                extractedData: updatedExtractedData,
                conversationHistory: input.conversationHistory,
            }, apiKey, model, agent.fsmValidatorPrompt);
            metrics.validationTime = Date.now() - validationStart;
            console.log('[FSM Engine] IA 3 (Decision Validator) completed', {
                approved: validationResult.approved,
                confidence: validationResult.confidence,
            });
            const loopDetection = this.decisionValidator.detectStateLoop(currentState.name, decisionResult.estado_escolhido, input.conversationHistory);
            if (loopDetection.hasLoop) {
                validationResult.alertas.push(loopDetection.description);
            }
            const isValid = this.decisionValidator.isValidTransition(currentState.name, decisionResult.estado_escolhido, routes);
            if (!isValid) {
                validationResult.alertas.push(`Transição inválida: ${currentState.name} → ${decisionResult.estado_escolhido}`);
            }
            metrics.totalTime = Date.now() - startTime;
            const knowledgeReasoning = [];
            if (knowledgeInfo.searched) {
                knowledgeReasoning.push('📚 BUSCA DE CONHECIMENTO:');
                knowledgeReasoning.push(`- Base: ${knowledgeInfo.chunksTotal} chunks (${knowledgeInfo.chunksWithEmbeddings} com embeddings)`);
                if (knowledgeInfo.chunksFound > 0) {
                    knowledgeReasoning.push(`- Encontrados: ${knowledgeInfo.chunksFound} chunks relevantes`);
                    knowledgeReasoning.push(`- Similaridade máxima: ${(knowledgeInfo.topSimilarity * 100).toFixed(1)}%`);
                }
                else {
                    knowledgeReasoning.push('- Nenhum conhecimento relevante encontrado');
                }
            }
            const output = {
                nextState: validationResult.approved
                    ? decisionResult.estado_escolhido
                    : validationResult.suggestedState || currentState.name,
                reasoning: [
                    '📊 EXTRAÇÃO DE DADOS:',
                    ...globalExtraction.reasoning,
                    ...specificExtraction.reasoning,
                    '---',
                    ...knowledgeReasoning,
                    '---',
                    '🎯 DECISÃO DE ESTADO:',
                    ...decisionResult.pensamento,
                    '---',
                    '✅ VALIDAÇÃO:',
                    `Status: ${validationResult.approved ? 'APROVADA' : 'REJEITADA'}`,
                    validationResult.justificativa,
                    ...validationResult.alertas.map(a => `⚠️ ${a}`),
                ],
                extractedData: specificExtraction.data,
                validation: validationResult,
                shouldExtractData: specificExtraction.success && specificExtraction.metadata.extractedFields.length > 0,
                metrics,
            };
            console.log('[FSM Engine] 3-AI decision process completed', {
                totalTime: metrics.totalTime,
                nextState: output.nextState,
                approved: validationResult.approved,
            });
            return output;
        }
        catch (error) {
            console.error('[FSM Engine] Fatal error:', error);
            metrics.totalTime = Date.now() - startTime;
            return {
                nextState: input.currentState,
                reasoning: [
                    'Erro fatal no motor de decisão.',
                    error instanceof Error ? error.message : 'Erro desconhecido',
                    'Mantendo estado atual por segurança.',
                ],
                extractedData: input.extractedData,
                validation: {
                    approved: false,
                    confidence: 0.0,
                    justificativa: 'Erro fatal no processamento',
                    alertas: ['Erro crítico no motor FSM'],
                },
                shouldExtractData: false,
                metrics,
            };
        }
    }
};
exports.FSMEngineService = FSMEngineService;
exports.FSMEngineService = FSMEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        openai_service_1.OpenAIService,
        knowledge_search_service_1.KnowledgeSearchService,
        data_extractor_service_1.DataExtractorService,
        state_decider_service_1.StateDeciderService,
        decision_validator_service_1.DecisionValidatorService])
], FSMEngineService);
//# sourceMappingURL=fsm-engine.service.js.map