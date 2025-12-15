import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenAIService } from '../services/openai.service';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { DataExtractorService } from './services/data-extractor.service';
import { StateDeciderService } from './services/state-decider.service';
import { DecisionValidatorService } from './services/decision-validator.service';
import * as toolsHandler from './tools-handler';
import {
    DecisionInput,
    DecisionOutput,
    StateInfo,
    AvailableRoutes,
    FSMEngineError,
    ExtractionInput,
    DecisionInputForAI,
    ValidationInput,
    AgentContext,
} from './types';

const MAX_RETRIES = 2;

// Helper functions for retry logic (inline implementation)
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(retryAttempt: number) {
    const baseDelay = 1000;
    const maxDelay = 4000;
    return Math.min(baseDelay * Math.pow(2, retryAttempt), maxDelay);
}

@Injectable()
export class FSMEngineService {
    constructor(
        private prisma: PrismaService,
        private openaiService: OpenAIService,
        private knowledgeSearch: KnowledgeSearchService,
        private dataExtractor: DataExtractorService,
        private stateDecider: StateDeciderService,
        private decisionValidator: DecisionValidatorService,
    ) { }

    /**
     * Motor de Decisão Principal
     */
    async decideNextState(input: DecisionInput): Promise<DecisionOutput> {
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

            // Buscar configuração do agente
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
                throw new FSMEngineError(
                    'AGENT_NOT_FOUND',
                    'Agente não encontrado ou sem chave OpenAI configurada',
                    { agentId: input.agentId },
                    false
                );
            }

            const openaiApiKey = agent.organization.openaiApiKey;
            const openaiModel = agent.organization.openaiModel || 'gpt-4o-mini';

            // Create agent context for prompts
            const agentContext: AgentContext = {
                name: agent.name,
                personality: agent.personality,
                tone: agent.tone,
                systemPrompt: agent.systemPrompt,
                instructions: agent.instructions,
                writingStyle: agent.writingStyle,
                prohibitions: agent.prohibitions,
                workingHours: agent.organization.workingHours,
            };

            // Buscar estado atual
            const state = await this.prisma.state.findFirst({
                where: {
                    agentId: input.agentId,
                    name: input.currentState,
                },
            });

            if (!state) {
                console.warn(`[FSM Engine] State '${input.currentState}' not found, using INICIO`);

                // Tentar buscar estado INICIO
                const inicioState = await this.prisma.state.findFirst({
                    where: {
                        agentId: input.agentId,
                        name: 'INICIO',
                    },
                });

                if (!inicioState) {
                    throw new FSMEngineError(
                        'STATE_NOT_FOUND',
                        `Estado '${input.currentState}' não encontrado e estado INICIO não existe`,
                        { currentState: input.currentState },
                        false
                    );
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
        } catch (error) {
            console.error('[FSM Engine] Fatal error:', error);

            metrics.totalTime = Date.now() - startTime;

            // Retornar estado atual em caso de erro
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
                    retryable: error instanceof FSMEngineError ? error.recoverable : false,
                },
                shouldExtractData: false,
                metrics,
            };
        }
    }

    /**
     * Processa um estado específico com as 3 IAs (Lógica Idêntica ao Legado)
     */
    private async processState(
        state: any,
        input: DecisionInput,
        openaiApiKey: string,
        openaiModel: string,
        metrics: any,
        startTime: number,
        agentContext: AgentContext,
        customPrompts?: {
            dataExtractor?: string | null;
            stateDecider?: string | null;
            validator?: string | null;
        }
    ): Promise<DecisionOutput> {
        const routes = state.availableRoutes as unknown as AvailableRoutes;
        const stateInfo: StateInfo = {
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
        let lastError: Error | null = null;

        // Variáveis de conhecimento - declaradas FORA do loop para estarem disponíveis no bloco de erro
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
                // ==================== GLOBAL DATA EXTRACTION ====================
                // Extract ALL possible dataKeys from the message
                const globalExtractionStart = Date.now();

                // Get all states for this agent to collect all dataKeys
                const allStates = await this.prisma.state.findMany({
                    where: { agentId: input.agentId },
                    select: {
                        dataKey: true,
                        dataDescription: true,
                        dataType: true,
                    },
                });

                // Build list of all dataKeys
                const allDataKeys = allStates
                    .filter((s: { dataKey: string | null; dataDescription: string | null; dataType: string | null }) => s.dataKey && s.dataKey !== 'vazio')
                    .map((s: { dataKey: string | null; dataDescription: string | null; dataType: string | null }) => ({
                        key: s.dataKey!,
                        description: s.dataDescription || '',
                        type: s.dataType || 'string',
                    }));

                console.log('[FSM Engine] Global extraction - found', allDataKeys.length, 'dataKeys');

                // Usar o service backend
                const globalExtractionResult = await this.dataExtractor.extractAllDataFromMessage(
                    {
                        message: input.lastMessage,
                        allDataKeys,
                        currentExtractedData: input.extractedData,
                        conversationHistory: input.conversationHistory,
                        agentContext,
                    },
                    openaiApiKey,
                    openaiModel
                );

                console.log('[FSM Engine] Global extraction completed', {
                    extractedCount: globalExtractionResult.metadata.extractedCount,
                    extractedFields: globalExtractionResult.metadata.extractedFields,
                });

                // Merge global extraction with current extracted data
                let updatedExtractedData = {
                    ...input.extractedData,
                    ...globalExtractionResult.extractedData,
                };

                // Save extracted data to lead if leadId is provided
                if (input.leadId && Object.keys(globalExtractionResult.extractedData).length > 0) {
                    await this.prisma.lead.update({
                        where: { id: input.leadId },
                        data: {
                            extractedData: updatedExtractedData,
                        },
                    });
                    console.log('[FSM Engine] Saved', Object.keys(globalExtractionResult.extractedData).length, 'new data fields to lead');
                }

                // Update input with new extracted data
                input.extractedData = updatedExtractedData;

                // ==================== GREETING IMPROVEMENT ====================
                // Check for greeting BEFORE the loop if no data was found
                // This ensures "Ola" triggers the specific greeting logic like legacy fallback
                const isGreeting = input.lastMessage.trim().length < 20 &&
                    input.conversationHistory.length <= 2;

                const greetingKeywords = ['ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello'];
                const containsGreeting = greetingKeywords.some(keyword =>
                    input.lastMessage.toLowerCase().includes(keyword)
                );

                const hasNewData = Object.values(globalExtractionResult.extractedData).some(v => v !== null && v !== undefined);

                if (isGreeting && containsGreeting && !hasNewData) {
                    console.log('[FSM Engine] Detected greeting (pre-loop), returning clean welcome message');
                    metrics.totalTime = Date.now() - startTime;
                    return {
                        nextState: state.name,
                        reasoning: [
                            'Saudação inicial detectada',
                            'Iniciando conversa com mensagem de boas-vindas',
                        ],
                        extractedData: input.extractedData,
                        validation: {
                            approved: true,
                            confidence: 0.8,
                            justificativa: 'Saudação inicial - iniciando conversa',
                            alertas: [],
                            retryable: false,
                        },
                        shouldExtractData: true,
                        dataToExtract: state.dataKey,
                        metrics,
                    };
                }

                // ==================== IA 1: DATA EXTRACTOR ====================
                const extractionStart = Date.now();

                const extractionInput: ExtractionInput = {
                    message: input.lastMessage,
                    dataKey: state.dataKey,
                    dataType: state.dataType,
                    dataDescription: state.dataDescription,
                    currentExtractedData: updatedExtractedData, // Use updated data
                    conversationHistory: input.conversationHistory,
                    agentContext,
                };

                const extractionResult = await this.dataExtractor.extractDataFromMessage(
                    extractionInput,
                    openaiApiKey,
                    openaiModel,
                    customPrompts?.dataExtractor
                );

                metrics.extractionTime = Date.now() - extractionStart;

                console.log('[FSM Engine] IA 1 (Data Extractor) completed', {
                    success: extractionResult.success,
                    confidence: extractionResult.confidence,
                    extractedFields: extractionResult.metadata.extractedFields,
                });

                // ==================== IA 2: STATE DECIDER ====================
                const decisionStart = Date.now();

                // Search for relevant knowledge before making decision
                try {
                    console.log('[FSM Engine] Searching knowledge base...', {
                        query: input.lastMessage.substring(0, 100),
                        agentId: input.agentId,
                        organizationId: input.organizationId,
                    });

                    // Get stats about knowledge base
                    const stats = await this.knowledgeSearch.getKnowledgeStats(input.agentId, input.organizationId);
                    knowledgeSearchInfo.chunksTotal = stats.totalChunks;
                    knowledgeSearchInfo.chunksWithEmbeddings = stats.chunksWithEmbeddings;
                    knowledgeSearchInfo.searched = true;

                    const searchResults = await this.knowledgeSearch.searchKnowledge(
                        input.lastMessage,
                        input.agentId,
                        input.organizationId,
                        openaiApiKey,
                        { topK: 50, minSimilarity: 0.5 }
                    );

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
                    } else {
                        console.log('[FSM Engine] No relevant knowledge found for query');
                    }
                } catch (knowledgeError: any) {
                    console.error('[FSM Engine] Knowledge search failed:', knowledgeError);
                    knowledgeSearchInfo.errorMessage = knowledgeError?.message || 'Erro desconhecido';
                }

                const decisionInput: DecisionInputForAI = {
                    currentState: state.name,
                    missionPrompt: state.missionPrompt,
                    dataKey: state.dataKey,
                    extractedData: extractionResult.data,
                    lastMessage: input.lastMessage,
                    conversationHistory: input.conversationHistory,
                    availableRoutes: routes,
                    prohibitions: state.prohibitions,
                    agentContext,
                    knowledgeContext,
                };

                const decisionResult = await this.stateDecider.decideStateTransition(
                    decisionInput,
                    openaiApiKey,
                    openaiModel,
                    customPrompts?.stateDecider
                );

                metrics.decisionTime = Date.now() - decisionStart;

                console.log('[FSM Engine] IA 2 (State Decider) completed', {
                    nextState: decisionResult.estado_escolhido,
                    veredito: decisionResult.veredito,
                    rota: decisionResult.rota_escolhida,
                    confianca: decisionResult.confianca,
                });

                // Validar regras do motor de decisão
                const rulesValidation = this.stateDecider.validateDecisionRules(decisionResult, decisionInput);
                if (!rulesValidation.valid) {
                    console.warn('[FSM Engine] Decision rules violated:', rulesValidation.errors);
                    decisionResult.pensamento.push(
                        '⚠️ AVISO: Regras do motor violadas:',
                        ...rulesValidation.errors
                    );
                }

                // ==================== IA 3: DECISION VALIDATOR ====================
                const validationStart = Date.now();

                const validationInput: ValidationInput = {
                    currentState: state.name,
                    proposedNextState: decisionResult.estado_escolhido,
                    decision: decisionResult,
                    extractedData: extractionResult.data,
                    conversationHistory: input.conversationHistory,
                    stateInfo,
                    agentContext,
                };

                const validationResult = await this.decisionValidator.validateDecision(
                    validationInput,
                    openaiApiKey,
                    openaiModel,
                    customPrompts?.validator
                );

                metrics.validationTime = Date.now() - validationStart;

                console.log('[FSM Engine] IA 3 (Decision Validator) completed', {
                    approved: validationResult.approved,
                    confidence: validationResult.confidence,
                    alertasCount: validationResult.alertas.length,
                });

                // Initialize final next state based on validation
                let finalNextState = validationResult.approved ? decisionResult.estado_escolhido : state.name;

                // ==================== TOOL EXECUTION ====================
                // Execute tools if the current state has them configured
                if (toolsHandler.hasTools(state)) {
                    try {
                        const toolsList = toolsHandler.parseStateTools(state);

                        if (toolsList.length > 0) {
                            console.log(`[FSM Engine] State '${state.name}' has tools:`, toolsList);

                            for (const toolName of toolsList) {
                                console.log(`[FSM Engine] Executing tool: ${toolName}`);

                                // Build tool arguments from extracted data
                                const diaHorario = updatedExtractedData.dia_horário || updatedExtractedData.horario_escolhido || '';

                                // Parse arguments logic can be complex, simplifying for backend parity or assuming similar logic
                                // For now passed hardcoded args or simplistic derivation as in legacy code if possible
                                // But without full logic from legacy tools-handler (which had date parsing), we pass updatedExtractedData simply?
                                // Legacy extracted date/time from diaHorario inside the loop (lines 444-476 of legacy ts).
                                // I will replicate that logic here.

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
                                    if (dateLower.includes('amanhã') || dateLower.includes('amanha')) date = 'amanhã';
                                    else if (dateLower.includes('segunda')) date = 'segunda-feira';
                                    else if (dateLower.includes('terça') || dateLower.includes('terca')) date = 'terça-feira';
                                    else if (dateLower.includes('quarta')) date = 'quarta-feira';
                                    else if (dateLower.includes('quinta')) date = 'quinta-feira';
                                    else if (dateLower.includes('sexta')) date = 'sexta-feira';
                                }

                                const toolArgs = { date, time, notes: `Agendamento via IA - ${diaHorario}` };

                                const toolResult = await toolsHandler.executeFSMTool(
                                    toolName,
                                    toolArgs,
                                    {
                                        organizationId: input.organizationId,
                                        leadId: input.leadId,
                                        conversationId: input.conversationHistory[0]?.content || '',
                                    }
                                );

                                console.log(`[FSM Engine] Tool '${toolName}' result:`, toolResult);

                                decisionResult.pensamento.push(
                                    `🔧 Ferramenta executada: ${toolName}`,
                                    toolResult.success ? `✅ ${toolResult.message}` : `❌ ${toolResult.message}`
                                );

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
                    } catch (error) {
                        console.error('[FSM Engine] Error executing tools:', error);
                        finalNextState = state.name;
                    }
                }

                // Detectar loops
                const loopDetection = this.decisionValidator.detectStateLoop(
                    state.name,
                    decisionResult.estado_escolhido,
                    input.conversationHistory
                );

                if (loopDetection.hasLoop) {
                    validationResult.alertas.push(loopDetection.description);
                }

                // Validar transição
                const isValid = this.decisionValidator.isValidTransition(
                    state.name,
                    decisionResult.estado_escolhido,
                    routes
                );

                if (!isValid) {
                    validationResult.alertas.push(
                        `Transição inválida: ${state.name} → ${decisionResult.estado_escolhido}`
                    );
                }

                // ==================== RETRY LOGIC ====================
                if (!validationResult.approved && validationResult.retryable && retryCount < MAX_RETRIES) {
                    retryCount++;
                    const backoffMs = calculateBackoff(retryCount - 1);
                    console.warn(`[FSM Engine] Validation failed, retrying (${retryCount}/${MAX_RETRIES}) after ${backoffMs}ms`);
                    lastError = new Error(validationResult.justificativa);
                    await delay(backoffMs);
                    continue; // Retry
                }

                // ==================== RESULTADO FINAL ====================
                metrics.totalTime = Date.now() - startTime;

                const knowledgeReasoningLines: string[] = [];
                knowledgeReasoningLines.push('📚 BASE DE CONHECIMENTO:');
                if (!knowledgeSearchInfo.searched) {
                    knowledgeReasoningLines.push('  ❌ Busca não realizada (erro)');
                } else if (knowledgeSearchInfo.chunksFound === 0) {
                    knowledgeReasoningLines.push('  ⚠️ Nenhum conhecimento relevante encontrado');
                } else {
                    knowledgeReasoningLines.push(`  ✅ CONHECIMENTO UTILIZADO: ${knowledgeSearchInfo.chunksFound} chunks relevantes`);
                    knowledgeReasoningLines.push(`  Similaridade máxima: ${(knowledgeSearchInfo.topSimilarity * 100).toFixed(1)}%`);
                }

                const output: DecisionOutput = {
                    nextState: validationResult.approved
                        ? decisionResult.estado_escolhido
                        : validationResult.suggestedState || state.name,
                    reasoning: [
                        ...knowledgeReasoningLines,
                        '---',
                        ...extractionResult.reasoning,
                        '---',
                        ...decisionResult.pensamento,
                        '---',
                        `Validação: ${validationResult.approved ? 'APROVADA' : 'REJEITADA'}`,
                        validationResult.justificativa,
                        ...validationResult.alertas.map(a => `⚠️ ${a}`),
                    ],
                    extractedData: extractionResult.data, // Using correctly identified specific extraction data
                    validation: validationResult,
                    shouldExtractData: extractionResult.success && extractionResult.metadata.extractedFields.length > 0,
                    dataToExtract: state.dataKey,
                    knowledgeContext: knowledgeContext || undefined,
                    metrics,
                };

                return output;

            } catch (error) {
                lastError = error as Error;
                console.error(`[FSM Engine] Error in attempt ${retryCount + 1}:`, error);

                if (retryCount < MAX_RETRIES) {
                    retryCount++;
                    const backoffMs = calculateBackoff(retryCount - 1);
                    console.warn(`[FSM Engine] Retrying after error in ${backoffMs}ms (${retryCount}/${MAX_RETRIES})`);
                    await delay(backoffMs);
                    continue; // Retry
                }
                break;
            }
        }

        // ==================== GREETING FALLBACK (When loop fails) ====================
        metrics.totalTime = Date.now() - startTime;

        const isGreeting = input.lastMessage.trim().length < 20 &&
            input.conversationHistory.length <= 2;

        const greetingKeywords = ['ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello'];
        const containsGreeting = greetingKeywords.some(keyword =>
            input.lastMessage.toLowerCase().includes(keyword)
        );

        if (isGreeting && containsGreeting) {
            console.log('[FSM Engine] Detected greeting (fallback), returning clean welcome message');
            return {
                nextState: state.name,
                reasoning: [
                    'Saudação inicial detectada',
                    'Iniciando conversa com mensagem de boas-vindas',
                ],
                extractedData: input.extractedData,
                validation: {
                    approved: true,
                    confidence: 0.8,
                    justificativa: 'Saudação inicial - iniciando conversa',
                    alertas: [],
                    retryable: false,
                },
                shouldExtractData: true,
                dataToExtract: state.dataKey,
                metrics,
            };
        }

        // Default Error output
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
}
