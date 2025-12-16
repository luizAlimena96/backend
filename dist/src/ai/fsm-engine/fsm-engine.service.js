"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const toolsHandler = __importStar(require("./tools-handler"));
const types_1 = require("./types");
const MAX_RETRIES = 2;
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function calculateBackoff(retryAttempt) {
    const baseDelay = 1000;
    const maxDelay = 4000;
    return Math.min(baseDelay * Math.pow(2, retryAttempt), maxDelay);
}
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
            decisionTime: 0,
            validationTime: 0,
            totalTime: 0,
        };
        try {
            console.log('[FSM Engine] Starting decision process', {
                agentId: input.agentId,
                currentState: input.currentState,
                lastMessage: input.lastMessage.substring(0, 100),
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
                    organizationId: true,
                    fsmDataExtractorPrompt: true,
                    fsmStateDeciderPrompt: true,
                    fsmValidatorPrompt: true,
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
                throw new types_1.FSMEngineError('AGENT_NOT_FOUND', 'Agente não encontrado ou sem chave OpenAI configurada', { agentId: input.agentId }, false);
            }
            const openaiApiKey = agent.organization.openaiApiKey;
            const openaiModel = agent.organization.openaiModel || 'gpt-4o-mini';
            const agentContext = {
                name: agent.name,
                personality: agent.personality,
                tone: agent.tone,
                systemPrompt: agent.systemPrompt,
                instructions: agent.instructions,
                writingStyle: agent.writingStyle,
                prohibitions: agent.prohibitions,
                workingHours: agent.organization.workingHours,
            };
            const state = await this.prisma.state.findFirst({
                where: {
                    agentId: input.agentId,
                    name: input.currentState,
                },
            });
            if (!state) {
                console.warn(`[FSM Engine] State '${input.currentState}' not found, using INICIO`);
                const inicioState = await this.prisma.state.findFirst({
                    where: {
                        agentId: input.agentId,
                        name: 'INICIO',
                    },
                });
                if (!inicioState) {
                    throw new types_1.FSMEngineError('STATE_NOT_FOUND', `Estado '${input.currentState}' não encontrado e estado INICIO não existe`, { currentState: input.currentState }, false);
                }
                return await this.processState(inicioState, input, openaiApiKey, openaiModel, metrics, startTime, agentContext, {
                    dataExtractor: input.customPrompts?.dataExtractor || agent.fsmDataExtractorPrompt,
                    stateDecider: input.customPrompts?.stateDecider || agent.fsmStateDeciderPrompt,
                    validator: input.customPrompts?.validator || agent.fsmValidatorPrompt,
                });
            }
            return await this.processState(state, input, openaiApiKey, openaiModel, metrics, startTime, agentContext, {
                dataExtractor: input.customPrompts?.dataExtractor || agent.fsmDataExtractorPrompt,
                stateDecider: input.customPrompts?.stateDecider || agent.fsmStateDeciderPrompt,
                validator: input.customPrompts?.validator || agent.fsmValidatorPrompt,
            });
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
                    retryable: error instanceof types_1.FSMEngineError ? error.recoverable : false,
                },
                shouldExtractData: false,
                metrics,
            };
        }
    }
    async processState(state, input, openaiApiKey, openaiModel, metrics, startTime, agentContext, customPrompts) {
        const routes = state.availableRoutes;
        const stateInfo = {
            id: state.id,
            name: state.name,
            missionPrompt: state.missionPrompt,
            availableRoutes: routes,
            dataKey: state.dataKey,
            dataDescription: state.dataDescription,
            dataType: state.dataType,
            prohibitions: state.prohibitions,
            tools: state.tools,
        };
        let retryCount = 0;
        let lastError = null;
        let knowledgeContext = '';
        let knowledgeSearchInfo = {
            searched: false,
            chunksFound: 0,
            chunksTotal: 0,
            chunksWithEmbeddings: 0,
            topSimilarity: 0,
            errorMessage: '',
        };
        while (retryCount <= MAX_RETRIES) {
            try {
                const globalExtractionStart = Date.now();
                const allStates = await this.prisma.state.findMany({
                    where: { agentId: input.agentId },
                    select: {
                        dataKey: true,
                        dataDescription: true,
                        dataType: true,
                    },
                });
                const allDataKeys = allStates
                    .filter((s) => s.dataKey && s.dataKey !== 'vazio')
                    .map((s) => ({
                    key: s.dataKey,
                    description: s.dataDescription || '',
                    type: s.dataType || 'string',
                }));
                console.log('[FSM Engine] Global extraction - found', allDataKeys.length, 'dataKeys');
                const globalExtractionResult = await this.dataExtractor.extractAllDataFromMessage({
                    message: input.lastMessage,
                    allDataKeys,
                    currentExtractedData: input.extractedData,
                    conversationHistory: input.conversationHistory,
                    agentContext,
                }, openaiApiKey, openaiModel);
                console.log('[FSM Engine] Global extraction completed', {
                    extractedCount: globalExtractionResult.metadata.extractedCount,
                    extractedFields: globalExtractionResult.metadata.extractedFields,
                });
                const safeNewData = {};
                for (const [key, value] of Object.entries(globalExtractionResult.extractedData)) {
                    if (value !== null && value !== undefined && value !== 'null' && value !== 'undefined') {
                        safeNewData[key] = value;
                    }
                }
                let updatedExtractedData = {
                    ...input.extractedData,
                    ...safeNewData,
                };
                if (input.leadId && Object.keys(safeNewData).length > 0) {
                    await this.prisma.lead.update({
                        where: { id: input.leadId },
                        data: {
                            extractedData: updatedExtractedData,
                        },
                    });
                    console.log('[FSM Engine] Saved', Object.keys(globalExtractionResult.extractedData).length, 'new data fields to lead');
                }
                input.extractedData = updatedExtractedData;
                const hasNewData = Object.values(globalExtractionResult.extractedData).some(v => v !== null && v !== undefined);
                const extractionStart = Date.now();
                const extractionInput = {
                    message: input.lastMessage,
                    dataKey: state.dataKey,
                    dataType: state.dataType,
                    dataDescription: state.dataDescription,
                    currentExtractedData: updatedExtractedData,
                    conversationHistory: input.conversationHistory,
                    agentContext,
                };
                const extractionResult = await this.dataExtractor.extractDataFromMessage(extractionInput, openaiApiKey, openaiModel, customPrompts?.dataExtractor);
                metrics.extractionTime = Date.now() - extractionStart;
                console.log('[FSM Engine] IA 1 (Data Extractor) completed', {
                    success: extractionResult.success,
                    confidence: extractionResult.confidence,
                    extractedFields: extractionResult.metadata.extractedFields,
                });
                const decisionStart = Date.now();
                try {
                    console.log('[FSM Engine] Searching knowledge base...', {
                        query: input.lastMessage.substring(0, 100),
                        agentId: input.agentId,
                        organizationId: input.organizationId,
                    });
                    const stats = await this.knowledgeSearch.getKnowledgeStats(input.agentId, input.organizationId);
                    knowledgeSearchInfo.chunksTotal = stats.totalChunks;
                    knowledgeSearchInfo.chunksWithEmbeddings = stats.chunksWithEmbeddings;
                    knowledgeSearchInfo.searched = true;
                    const searchResults = await this.knowledgeSearch.searchKnowledge(input.lastMessage, input.agentId, input.organizationId, openaiApiKey, { topK: 50, minSimilarity: 0.5 });
                    knowledgeSearchInfo.chunksFound = searchResults.length;
                    if (searchResults.length > 0) {
                        knowledgeSearchInfo.topSimilarity = searchResults[0].similarity;
                    }
                    console.log('[FSM Engine] Knowledge search completed', {
                        resultsCount: searchResults.length,
                        stats: knowledgeSearchInfo
                    });
                    if (searchResults.length > 0) {
                        knowledgeContext = this.knowledgeSearch.formatKnowledgeContext(searchResults);
                        console.log(`[FSM Engine] Knowledge context added (${knowledgeContext.length} chars)`);
                    }
                    else {
                        console.log('[FSM Engine] No relevant knowledge found for query');
                    }
                }
                catch (knowledgeError) {
                    console.error('[FSM Engine] Knowledge search failed:', knowledgeError);
                    knowledgeSearchInfo.errorMessage = knowledgeError?.message || 'Erro desconhecido';
                }
                let dynamicProhibitions = state.prohibitions || '';
                const isDataMissing = state.dataKey &&
                    (!extractionResult.data[state.dataKey] || extractionResult.data[state.dataKey] === null);
                if (isDataMissing) {
                    const forceAskMsg = `\nIMPORTANTE: O dado '${state.dataKey}' ainda não foi coletado. SUA ÚNICA MISSÃO AGORA É PERGUNTAR ISSO AO USUÁRIO. NÃO AVANCE DE ESTADO SEM ISSO.`;
                    dynamicProhibitions += forceAskMsg;
                    state.missionPrompt += forceAskMsg;
                }
                const decisionInput = {
                    currentState: state.name,
                    missionPrompt: state.missionPrompt,
                    dataKey: state.dataKey,
                    extractedData: extractionResult.data,
                    lastMessage: input.lastMessage,
                    conversationHistory: input.conversationHistory,
                    availableRoutes: routes,
                    prohibitions: dynamicProhibitions,
                    agentContext,
                    knowledgeContext,
                };
                const decisionResult = await this.stateDecider.decideStateTransition(decisionInput, openaiApiKey, openaiModel, customPrompts?.stateDecider);
                metrics.decisionTime = Date.now() - decisionStart;
                console.log('[FSM Engine] IA 2 (State Decider) completed', {
                    nextState: decisionResult.estado_escolhido,
                    veredito: decisionResult.veredito,
                    rota: decisionResult.rota_escolhida,
                    confianca: decisionResult.confianca,
                });
                const rulesValidation = this.stateDecider.validateDecisionRules(decisionResult, decisionInput);
                if (!rulesValidation.valid) {
                    console.warn('[FSM Engine] Decision rules violated:', rulesValidation.errors);
                    decisionResult.pensamento.push('⚠️ AVISO: Regras do motor violadas:', ...rulesValidation.errors);
                }
                const validationStart = Date.now();
                const validationInput = {
                    currentState: state.name,
                    proposedNextState: decisionResult.estado_escolhido,
                    decision: decisionResult,
                    extractedData: extractionResult.data,
                    conversationHistory: input.conversationHistory,
                    stateInfo,
                    agentContext,
                };
                const validationResult = await this.decisionValidator.validateDecision(validationInput, openaiApiKey, openaiModel, customPrompts?.validator);
                metrics.validationTime = Date.now() - validationStart;
                console.log('[FSM Engine] IA 3 (Decision Validator) completed', {
                    approved: validationResult.approved,
                    confidence: validationResult.confidence,
                    alertasCount: validationResult.alertas.length,
                });
                let finalNextState = validationResult.approved ? decisionResult.estado_escolhido : state.name;
                if (toolsHandler.hasTools(state)) {
                    try {
                        const toolsList = toolsHandler.parseStateTools(state);
                        if (toolsList.length > 0) {
                            console.log(`[FSM Engine] State '${state.name}' has tools:`, toolsList);
                            for (const toolConfig of toolsList) {
                                const configObj = typeof toolConfig === 'string'
                                    ? { name: toolConfig, args: {} }
                                    : toolConfig;
                                const toolName = configObj.name;
                                const toolStaticArgs = configObj.args || {};
                                console.log(`[FSM Engine] Executing tool: ${toolName}`, { staticArgs: toolStaticArgs });
                                let toolArgs = { ...toolStaticArgs };
                                if (toolName === 'gerenciar_agenda') {
                                    if (updatedExtractedData.periodo_dia)
                                        toolArgs.periodo_dia = updatedExtractedData.periodo_dia;
                                    const dataExt = updatedExtractedData.data_especifica || updatedExtractedData.dia;
                                    const horaExt = updatedExtractedData.horario_especifico || updatedExtractedData.horario;
                                    if (dataExt)
                                        toolArgs.data_especifica = dataExt;
                                    if (horaExt)
                                        toolArgs.horario_especifico = horaExt;
                                    const diaHorario = updatedExtractedData.dia_horário || updatedExtractedData.horario_escolhido;
                                    if (diaHorario && !toolArgs.data_especifica) {
                                        const timeMatch = diaHorario.match(/(\d{1,2}):?(\d{2})?h?/);
                                        if (timeMatch) {
                                            const hours = timeMatch[1].padStart(2, '0');
                                            const minutes = (timeMatch[2] || '00').padStart(2, '0');
                                            toolArgs.horario_especifico = `${hours}:${minutes}`;
                                        }
                                        toolArgs.mensagem_original = diaHorario;
                                    }
                                }
                                else {
                                    const diaHorario = updatedExtractedData.dia_horário || updatedExtractedData.horario_escolhido || '';
                                    let date = '';
                                    let time = '';
                                    if (diaHorario) {
                                        const timeMatch = diaHorario.match(/(\d{1,2}):?(\d{2})?h?/);
                                        if (timeMatch) {
                                            const hours = timeMatch[1];
                                            const minutes = timeMatch[2] || '00';
                                            time = `${hours}:${minutes}`;
                                        }
                                        const dateLower = diaHorario.toLowerCase();
                                        if (dateLower.includes('amanhã') || dateLower.includes('amanha'))
                                            date = 'amanhã';
                                        else if (dateLower.includes('segunda'))
                                            date = 'segunda-feira';
                                        else if (dateLower.includes('terça') || dateLower.includes('terca'))
                                            date = 'terça-feira';
                                        else if (dateLower.includes('quarta'))
                                            date = 'quarta-feira';
                                        else if (dateLower.includes('quinta'))
                                            date = 'quinta-feira';
                                        else if (dateLower.includes('sexta'))
                                            date = 'sexta-feira';
                                    }
                                    toolArgs = { date, time, notes: `Agendamento via IA - ${diaHorario}`, ...toolArgs };
                                }
                                const toolResult = await toolsHandler.executeFSMTool(toolName, toolArgs, {
                                    organizationId: input.organizationId,
                                    leadId: input.leadId,
                                    conversationId: input.conversationHistory[0]?.content || '',
                                });
                                console.log(`[FSM Engine] Tool '${toolName}' result:`, toolResult);
                                decisionResult.pensamento.push(`🔧 Ferramenta executada: ${toolName}`, toolResult.success ? `✅ ${toolResult.message}` : `❌ ${toolResult.message}`);
                                if (!toolResult.success) {
                                    validationResult.alertas.push(`Ferramenta '${toolName}' falhou: ${toolResult.error}`);
                                    finalNextState = state.name;
                                }
                                if (toolResult.success && toolResult.data) {
                                    updatedExtractedData = { ...updatedExtractedData, ...toolResult.data };
                                    if (input.leadId) {
                                        await this.prisma.lead.update({
                                            where: { id: input.leadId },
                                            data: { extractedData: updatedExtractedData }
                                        });
                                    }
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.error('[FSM Engine] Error executing tools:', error);
                        finalNextState = state.name;
                    }
                }
                const loopDetection = this.decisionValidator.detectStateLoop(state.name, decisionResult.estado_escolhido, input.conversationHistory);
                if (loopDetection.hasLoop) {
                    validationResult.alertas.push(loopDetection.description);
                }
                const isValid = this.decisionValidator.isValidTransition(state.name, decisionResult.estado_escolhido, routes);
                if (!isValid) {
                    validationResult.alertas.push(`Transição inválida: ${state.name} → ${decisionResult.estado_escolhido}`);
                }
                if (!validationResult.approved && validationResult.retryable && retryCount < MAX_RETRIES) {
                    retryCount++;
                    const backoffMs = calculateBackoff(retryCount - 1);
                    console.warn(`[FSM Engine] Validation failed, retrying (${retryCount}/${MAX_RETRIES}) after ${backoffMs}ms`);
                    lastError = new Error(validationResult.justificativa);
                    await delay(backoffMs);
                    continue;
                }
                metrics.totalTime = Date.now() - startTime;
                const knowledgeReasoningLines = [];
                knowledgeReasoningLines.push('📚 BASE DE CONHECIMENTO:');
                if (!knowledgeSearchInfo.searched) {
                    knowledgeReasoningLines.push('  ❌ Busca não realizada (erro)');
                }
                else if (knowledgeSearchInfo.chunksFound === 0) {
                    knowledgeReasoningLines.push('  ⚠️ Nenhum conhecimento relevante encontrado');
                }
                else {
                    knowledgeReasoningLines.push(`  ✅ CONHECIMENTO UTILIZADO: ${knowledgeSearchInfo.chunksFound} chunks relevantes`);
                    knowledgeReasoningLines.push(`  Similaridade máxima: ${(knowledgeSearchInfo.topSimilarity * 100).toFixed(1)}%`);
                }
                const finalReasoning = [
                    ...(knowledgeReasoningLines || []),
                    '---',
                    ...(extractionResult?.reasoning || []),
                    '---',
                    ...(decisionResult?.pensamento || []),
                    '---',
                    `Validação: ${validationResult?.approved ? 'APROVADA' : 'REJEITADA'}`,
                    validationResult?.justificativa || '',
                    ...(validationResult?.alertas?.map(a => `⚠️ ${a}`) || []),
                ];
                const output = {
                    nextState: finalNextState,
                    reasoning: finalReasoning,
                    extractedData: extractionResult.data,
                    validation: validationResult,
                    shouldExtractData: extractionResult.success && extractionResult.metadata.extractedFields.length > 0,
                    dataToExtract: state.dataKey,
                    knowledgeContext: knowledgeContext || undefined,
                    metrics,
                };
                return output;
            }
            catch (error) {
                lastError = error;
                console.error(`[FSM Engine] Error in attempt ${retryCount + 1}:`, error);
                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    const backoffMs = calculateBackoff(retryCount - 1);
                    console.warn(`[FSM Engine] Retrying after error in ${backoffMs}ms (${retryCount}/${MAX_RETRIES})`);
                    await delay(backoffMs);
                    continue;
                }
                break;
            }
        }
        metrics.totalTime = Date.now() - startTime;
        return {
            nextState: state.name,
            reasoning: [
                `Erro após ${MAX_RETRIES + 1} tentativas.`,
                lastError?.message || 'Formato de resposta inválido da IA',
                'Mantendo estado atual por segurança.',
            ],
            extractedData: input.extractedData,
            validation: {
                approved: false,
                confidence: 0.0,
                justificativa: `Falha após ${MAX_RETRIES + 1} tentativas`,
                alertas: ['Erro crítico - máximo de retries atingido'],
                retryable: false,
            },
            shouldExtractData: false,
            knowledgeContext: knowledgeContext || undefined,
            metrics,
        };
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