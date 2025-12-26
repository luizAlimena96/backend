import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OpenAIService } from '../services/openai.service';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { DataExtractorService } from './services/data-extractor.service';
import { StateDeciderService } from './services/state-decider.service';
import { DecisionValidatorService } from './services/decision-validator.service';
import { SchedulingToolsService } from '../tools/scheduling-tools.service';
import { ContractToolsService } from '../tools/contract-tools.service';
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
        private schedulingToolsService: SchedulingToolsService,
        private contractToolsService: ContractToolsService,
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

            // DEBUG: Log FSM prompts from database
            console.log('[FSM Engine] 🔍 DEBUG - Prompts from database:', {
                agentId: agent.id,
                agentName: agent.name,
                hasDataExtractorPrompt: !!agent.fsmDataExtractorPrompt,
                dataExtractorPromptLength: agent.fsmDataExtractorPrompt?.length || 0,
                hasStateDeciderPrompt: !!agent.fsmStateDeciderPrompt,
                stateDeciderPromptLength: agent.fsmStateDeciderPrompt?.length || 0,
                hasValidatorPrompt: !!agent.fsmValidatorPrompt,
                validatorPromptLength: agent.fsmValidatorPrompt?.length || 0,
            });

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
                    .filter((s: { dataKey: string | null; dataDescription: string | null; dataType: string | null }) => s.dataKey && s.dataKey !== 'vazio')
                    .map((s: { dataKey: string | null; dataDescription: string | null; dataType: string | null }) => ({
                        key: s.dataKey!,
                        description: s.dataDescription || '',
                        type: s.dataType || 'string',
                    }));

                console.log('[FSM Engine] Global extraction - found', allDataKeys.length, 'dataKeys');

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

                const safeNewData: Record<string, any> = {};
                for (const [key, value] of Object.entries(globalExtractionResult.extractedData)) {
                    if (value !== null && value !== undefined && value !== 'null' && value !== 'undefined') {
                        safeNewData[key] = value;
                    }
                }

                // ==================== SMART MERGE FOR horario_escolhido ====================
                // If the existing horario_escolhido has a specific date (DD/MM) but the new one doesn't,
                // preserve the existing date and only update the time (if different)
                if (safeNewData.horario_escolhido && input.extractedData?.horario_escolhido) {
                    const newHorario = safeNewData.horario_escolhido.toLowerCase();
                    const existingHorario = input.extractedData.horario_escolhido;

                    // Check if existing value has a specific date (DD/MM format)
                    const existingDateMatch = existingHorario.match(/(\d{1,2})\/(\d{1,2})/);
                    // Check if NEW value has a specific date
                    const newDateMatch = safeNewData.horario_escolhido.match(/(\d{1,2})\/(\d{1,2})/);

                    // If existing has date but new doesn't → preserve existing (new is probably "segunda às 11:00" or "amanhã às 11:00")
                    if (existingDateMatch && !newDateMatch) {
                        console.log('[FSM Engine] 🔄 Smart merge: preserving existing horario_escolhido (new value lacks specific date):', {
                            existing: input.extractedData.horario_escolhido,
                            newAttempted: safeNewData.horario_escolhido,
                            action: 'keeping existing'
                        });
                        // Just keep the existing value - don't overwrite with day name
                        delete safeNewData.horario_escolhido;
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

                // ==================== IA 1: DATA EXTRACTOR ====================
                const extractionStart = Date.now();

                const extractionInput: ExtractionInput = {
                    message: input.lastMessage,
                    dataKey: state.dataKey,
                    dataType: state.dataType,
                    dataDescription: state.dataDescription,
                    currentExtractedData: updatedExtractedData,
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

                // Save the extracted data to the lead (extractionResult.data contains merged + newly extracted data)
                if (input.leadId && extractionResult.success && extractionResult.metadata.extractedFields.length > 0) {
                    try {
                        updatedExtractedData = {
                            ...updatedExtractedData,
                            ...extractionResult.data,
                        };

                        await this.prisma.lead.update({
                            where: { id: input.leadId },
                            data: {
                                extractedData: updatedExtractedData,
                            },
                        });
                        console.log('[FSM Engine] Saved extractionResult data to lead', {
                            savedFields: extractionResult.metadata.extractedFields,
                        });

                        // Update input.extractedData for subsequent operations
                        input.extractedData = updatedExtractedData;
                    } catch (saveError: any) {
                        console.error('[FSM Engine] Failed to save extractionResult to lead:', saveError.message);
                    }
                }

                // ==================== IA 2: STATE DECIDER ====================
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

                let dynamicProhibitions = state.prohibitions || '';
                const isDataMissing = state.dataKey &&
                    (!extractionResult.data[state.dataKey] || extractionResult.data[state.dataKey] === null);

                let dynamicMissionPrompt = state.missionPrompt;
                if (isDataMissing) {
                    const forceAskMsg = `\nIMPORTANTE: O dado '${state.dataKey}' ainda não foi coletado. SUA ÚNICA MISSÃO AGORA É PERGUNTAR ISSO AO USUÁRIO. NÃO AVANCE DE ESTADO SEM ISSO.`;
                    dynamicProhibitions += forceAskMsg;
                    dynamicMissionPrompt += forceAskMsg;
                }

                const decisionInput: DecisionInputForAI = {
                    currentState: state.name,
                    missionPrompt: dynamicMissionPrompt,
                    dataKey: state.dataKey,
                    extractedData: extractionResult.data,
                    lastMessage: input.lastMessage,
                    conversationHistory: input.conversationHistory,
                    availableRoutes: routes,
                    prohibitions: dynamicProhibitions,
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

                // ==================== INJETAR CONTEXTO NO PENSAMENTO ====================
                const contextLog = [
                    '📥 --- CONTEXTO DE ENTRADA (STATE DECIDER) ---',
                    `Estado: ${decisionInput.currentState}`,
                    `Missão: ${decisionInput.missionPrompt}`,
                    `Chave de Validação: ${decisionInput.dataKey}`,
                    `Valor na Memória: ${decisionInput.dataKey ? (decisionInput.extractedData[decisionInput.dataKey] || 'null') : 'N/A'}`,
                    `Dados Extraídos (Entrada): ${JSON.stringify(decisionInput.extractedData)}`,
                    `Mensagem Usuário: "${decisionInput.lastMessage}"`,
                    `Rotas Disponíveis: ${Object.keys(decisionInput.availableRoutes).filter(k => (decisionInput.availableRoutes as any)[k]?.length > 0).join(', ')}`,
                    '🧠 --- RACIOCÍNIO DA IA ---'
                ];

                decisionResult.pensamento = [...contextLog, ...decisionResult.pensamento];

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

                let finalNextState = validationResult.approved ? decisionResult.estado_escolhido : state.name;

                console.log(`[FSM Engine] Checking tools for state '${state.name}':`, {
                    tools: state.tools,
                    hasTools: toolsHandler.hasTools(state)
                });

                // ==================== AUTO-DETECT SCHEDULING ====================
                // If NEXT state name suggests scheduling confirmation, auto-execute criar_evento
                const nextStateNameUpper = finalNextState.toUpperCase();
                const isSchedulingConfirmState = nextStateNameUpper.includes('AGENDAMENTO') &&
                    (nextStateNameUpper.includes('CONFIRMAR') || nextStateNameUpper.includes('CRIAR'));

                if (isSchedulingConfirmState) {
                    console.log('[FSM Engine] 🗓️ Auto-detected scheduling confirmation state');

                    // Get horario_escolhido from extraction result first
                    let horarioFromExtraction = extractionResult?.data?.horario_escolhido;

                    // If extraction failed, parse directly from user message ("quinta as 8")
                    if (!horarioFromExtraction && input.lastMessage) {
                        const userMsg = input.lastMessage.toLowerCase();
                        const now = new Date();
                        const dayMap: Record<string, number> = {
                            'domingo': 0, 'segunda': 1, 'terça': 2, 'terca': 2,
                            'quarta': 3, 'quinta': 4, 'sexta': 5, 'sábado': 6, 'sabado': 6
                        };

                        let parsedDay: Date | null = null;
                        let parsedTime: string | null = null;

                        for (const [dayName, dayIdx] of Object.entries(dayMap)) {
                            if (userMsg.includes(dayName)) {
                                let daysToAdd = dayIdx - now.getDay();
                                if (daysToAdd <= 0) daysToAdd += 7;
                                parsedDay = new Date(now);
                                parsedDay.setDate(now.getDate() + daysToAdd);
                                console.log(`[FSM Engine] 🗓️ Parsed day: ${dayName} -> ${parsedDay.toISOString().split('T')[0]}`);
                                break;
                            }
                        }

                        const timeMatch = userMsg.match(/(?:[àa]s?\s*)?(\d{1,2})(?:\s*[h:]\s*(\d{2})?)?/);
                        if (timeMatch) {
                            const h = (timeMatch[1] || '08').padStart(2, '0');
                            const m = (timeMatch[2] || '00').padStart(2, '0');
                            parsedTime = `${h}${m}`;
                            console.log(`[FSM Engine] 🗓️ Parsed time: ${parsedTime}`);
                        }

                        if (parsedDay && parsedTime) {
                            const d = parsedDay.getDate().toString().padStart(2, '0');
                            const mo = (parsedDay.getMonth() + 1).toString().padStart(2, '0');
                            horarioFromExtraction = `(${d}/${mo}) às ${parsedTime}`;
                            console.log(`[FSM Engine] 🗓️ Built horario_escolhido: ${horarioFromExtraction}`);
                        }
                    }

                    const horarioEscolhido = horarioFromExtraction || updatedExtractedData.horario_escolhido;

                    console.log('[FSM Engine] 🗓️ horario_escolhido from extraction:', horarioFromExtraction);
                    console.log('[FSM Engine] 🗓️ horario_escolhido final:', horarioEscolhido);

                    if (horarioEscolhido) {
                        // Use the centralized parser from schedulingToolsService
                        console.log('[FSM Engine] 🗓️ Using centralized parser for auto-scheduling:', horarioEscolhido);

                        const parsed = this.schedulingToolsService.parseHorarioEscolhido(horarioEscolhido);
                        let data_especifica = parsed?.data_especifica || '';
                        let horario_especifico = parsed?.horario_especifico || '';

                        // If centralized parser succeeded, use the results
                        if (parsed) {
                            console.log('[FSM Engine] 🗓️ Centralized parser success:', parsed);
                        } else {
                            // Fallback parsing for legacy formats
                            console.log('[FSM Engine] 🗓️ Centralized parser failed, trying fallback...');

                            // Try to extract time
                            let timeMatch = horarioEscolhido.match(/às\s*(\d{2})(\d{2})/i);
                            if (!timeMatch) timeMatch = horarioEscolhido.match(/(\d{1,2}):(\d{2})/);
                            if (!timeMatch) timeMatch = horarioEscolhido.match(/(\d{1,2})h(\d{2})?/);

                            if (timeMatch) {
                                const hours = timeMatch[1].padStart(2, '0');
                                const minutes = (timeMatch[2] || '00').padStart(2, '0');
                                horario_especifico = `${hours}:${minutes}`;
                            }

                            // Try to extract DD/MM date
                            const dateMatch = horarioEscolhido.match(/(\d{1,2})\/(\d{1,2})/);
                            if (dateMatch) {
                                const day = parseInt(dateMatch[1]);
                                const month = parseInt(dateMatch[2]);
                                const now = new Date();
                                let year = now.getFullYear();

                                // Check if date is in the past
                                const targetDate = new Date(year, month - 1, day);
                                const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                if (targetDate < todayMidnight) {
                                    year = year + 1;
                                }

                                data_especifica = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                            }
                        }

                        console.log('[FSM Engine] 🗓️ Final parsed values:', { data_especifica, horario_especifico });

                        if (data_especifica && horario_especifico) {
                            try {
                                const toolResult = await toolsHandler.executeFSMTool(
                                    'criar_evento',
                                    {
                                        acao: 'confirmar',
                                        data_especifica,
                                        horario_especifico,
                                        mensagem_original: horarioEscolhido
                                    },
                                    {
                                        organizationId: input.organizationId,
                                        leadId: input.leadId,
                                        conversationId: input.conversationHistory[0]?.content || '',
                                    },
                                    {
                                        schedulingTools: this.schedulingToolsService,
                                        contractTools: this.contractToolsService,
                                    }
                                );

                                console.log('[FSM Engine] 🗓️ Auto-scheduling result:', toolResult);

                                if (toolResult.success) {
                                    updatedExtractedData.agendamento_confirmado = data_especifica + ' ' + horario_especifico;
                                }
                            } catch (error) {
                                console.error('[FSM Engine] 🗓️ Auto-scheduling error:', error);
                            }
                        }
                    }
                }

                // ==================== AUTO-DETECT CANCEL/RESCHEDULE INTENT ====================
                // Execute cancellation even if current state doesn't have tools configured
                const userMsgLower = input.lastMessage.toLowerCase();
                const cancelKeywords = ['cancelar', 'cancela', 'não quero mais', 'desmarcar', 'desmarque', 'desisto', 'não vou mais'];
                const rescheduleKeywords = ['reagendar', 'remarcar', 'mudar horário', 'mudar o horário', 'outro horário', 'trocar horário'];

                const wantsToCancelGlobal = cancelKeywords.some(kw => userMsgLower.includes(kw));
                const wantsToRescheduleGlobal = rescheduleKeywords.some(kw => userMsgLower.includes(kw));

                // Track if cancellation was already executed globally to avoid duplicate execution
                let globalCancelExecuted = false;

                if (wantsToCancelGlobal && !wantsToRescheduleGlobal) {
                    console.log('[FSM Engine] 🗓️ GLOBAL: Cancel intent detected - executing cancelar');
                    try {
                        const toolResult = await toolsHandler.executeFSMTool(
                            'gerenciar_agenda',
                            { acao: 'cancelar' },
                            {
                                organizationId: input.organizationId,
                                leadId: input.leadId,
                                conversationId: input.conversationHistory[0]?.content || '',
                            },
                            {
                                schedulingTools: this.schedulingToolsService,
                                contractTools: this.contractToolsService,
                            }
                        );

                        console.log('[FSM Engine] 🗓️ GLOBAL Cancel result:', toolResult);
                        globalCancelExecuted = toolResult.success; // Mark as executed if successful

                        decisionResult.pensamento.push(
                            '🔧 Ferramenta executada: gerenciar_agenda (cancelar)',
                            toolResult.success ? `✅ ${toolResult.message}` : `❌ ${toolResult.message}`
                        );
                    } catch (error) {
                        console.error('[FSM Engine] 🗓️ GLOBAL Cancel error:', error);
                    }
                } else if (wantsToRescheduleGlobal) {
                    console.log('[FSM Engine] 🗓️ GLOBAL: Reschedule intent detected - will suggest new times');
                    // Reschedule is handled by the normal tool flow since it may need new times
                }

                // ==================== TOOL EXECUTION (if tools configured) ====================
                // IMPORTANT: Check tools on the TARGET state (finalNextState), not current state
                // When transitioning from A to B, we need to execute B's tools, not A's

                let stateForTools = state; // Default to current state

                // If transitioning to a different state, get that state's config for tools
                if (finalNextState !== state.name) {
                    const targetState = await this.prisma.state.findFirst({
                        where: { agentId: input.agentId, name: finalNextState }
                    });
                    if (targetState) {
                        stateForTools = targetState as any;
                        console.log(`[FSM Engine] 🔧 Transitioning to '${finalNextState}' - checking its tools`);
                    }
                }

                console.log(`[FSM Engine] Checking tools for state '${stateForTools.name}':`, {
                    tools: stateForTools.tools,
                    hasTools: toolsHandler.hasTools(stateForTools)
                });

                if (toolsHandler.hasTools(stateForTools)) {
                    try {
                        const toolsList = toolsHandler.parseStateTools(stateForTools);

                        if (toolsList.length > 0) {
                            console.log(`[FSM Engine] State '${stateForTools.name}' has tools:`, toolsList);

                            // Check if lead has an existing active appointment (database check)
                            let existingAppointmentId: string | null = null;
                            let schedulingToolExecuted = false; // Flag to prevent redundant execution

                            try {
                                const existingAppointment = await this.prisma.appointment.findFirst({
                                    where: {
                                        leadId: input.leadId,
                                        organizationId: input.organizationId,
                                        status: 'SCHEDULED',
                                        scheduledAt: { gte: new Date() }
                                    }
                                });
                                existingAppointmentId = existingAppointment?.id || null;
                                console.log('[FSM Engine] DB Check - existingAppointmentId:', existingAppointmentId);
                            } catch (e) {
                                console.error('[FSM Engine] Error checking existing appointment:', e);
                            }

                            // Determine user intent based on extracted data
                            const hasNewDateTime = !!(updatedExtractedData.horario_escolhido ||
                                (updatedExtractedData.data_especifica && updatedExtractedData.horario_especifico));

                            const userMsgLower = input.lastMessage.toLowerCase();
                            const wantsToCancelOnly = ['cancelar', 'cancela', 'desmarcar', 'não quero mais', 'desisto'].some(kw => userMsgLower.includes(kw))
                                && !hasNewDateTime;

                            console.log('[FSM Engine] Intent analysis:', {
                                existingAppointmentId,
                                hasNewDateTime,
                                wantsToCancelOnly
                            });

                            for (const toolConfig of toolsList) {
                                // Cast to access properties since it can be string or object
                                const configObj = typeof toolConfig === 'string'
                                    ? { name: toolConfig, args: {} }
                                    : toolConfig as { name: string; args?: any };

                                const toolName = configObj.name;
                                const toolStaticArgs = configObj.args || {};

                                // Skip cancel/reschedule tools if global cancellation was already executed
                                if (globalCancelExecuted && (toolName === 'cancelar_evento' || toolName === 'reagendar_evento')) {
                                    console.log(`[FSM Engine] Skipping tool '${toolName}' - global cancellation already executed`);
                                    continue;
                                }

                                // SMART LOGIC based on database state:
                                // 1. If user wants to schedule/reschedule (has new date/time) → only run reagendar_evento
                                // 2. If user wants to cancel only (no new date/time) → only run cancelar_evento
                                // 3. If scheduling tool was executed → skip cancelar_evento

                                if (hasNewDateTime && toolName === 'cancelar_evento') {
                                    console.log(`[FSM Engine] Skipping tool '${toolName}' - user wants to schedule new time, not cancel`);
                                    continue;
                                }

                                if (wantsToCancelOnly && toolName === 'reagendar_evento') {
                                    console.log(`[FSM Engine] Skipping tool '${toolName}' - user wants to cancel, not reschedule`);
                                    continue;
                                }

                                if (schedulingToolExecuted && toolName === 'cancelar_evento') {
                                    console.log(`[FSM Engine] Skipping tool '${toolName}' - scheduling tool was just executed`);
                                    continue;
                                }

                                console.log(`[FSM Engine] Executing tool: ${toolName}`, { staticArgs: toolStaticArgs });

                                let toolArgs: any = { ...toolStaticArgs };

                                if (toolName === 'gerenciar_agenda' || toolName === 'criar_evento') {
                                    // Merge extracted data into args
                                    if (updatedExtractedData.periodo_dia) toolArgs.periodo_dia = updatedExtractedData.periodo_dia;

                                    // Handle dates and times intelligently
                                    const dataExt = updatedExtractedData.data_especifica || updatedExtractedData.dia;
                                    const horaExt = updatedExtractedData.horario_especifico || updatedExtractedData.horario;

                                    if (dataExt) toolArgs.data_especifica = dataExt;
                                    if (horaExt) toolArgs.horario_especifico = horaExt;

                                    // Handle legacy "diaHorario" field if present
                                    // PRIORITY: Fresh extraction from globalExtractionResult > updatedExtractedData (may contain old DB values)
                                    const freshHorario = globalExtractionResult?.extractedData?.horario_escolhido;
                                    const diaHorario = freshHorario || updatedExtractedData.dia_horário || updatedExtractedData.horario_escolhido;

                                    console.log('[FSM Engine] 🕐 Scheduling data debug:', {
                                        freshHorario,
                                        dbHorario: updatedExtractedData.horario_escolhido,
                                        finalDiaHorario: diaHorario,
                                    });

                                    if (diaHorario && (!toolArgs.data_especifica || !toolArgs.horario_especifico)) {
                                        console.log('[FSM Engine] Parsing diaHorario using centralized parser:', diaHorario);

                                        // Use the centralized parser from schedulingToolsService
                                        // This handles format: "(DD/MM) às HHMM" or "(DD/MM/YYYY) às HHMM" or "DD/MM às HHMM"
                                        const parsed = this.schedulingToolsService.parseHorarioEscolhido(diaHorario);

                                        if (parsed) {
                                            if (!toolArgs.data_especifica) {
                                                toolArgs.data_especifica = parsed.data_especifica;
                                                console.log('[FSM Engine] ✅ Parsed date:', toolArgs.data_especifica);
                                            }
                                            if (!toolArgs.horario_especifico) {
                                                toolArgs.horario_especifico = parsed.horario_especifico;
                                                console.log('[FSM Engine] ✅ Parsed time:', toolArgs.horario_especifico);
                                            }
                                        } else {
                                            console.log('[FSM Engine] ⚠️ Centralized parser failed, using fallback...');

                                            // Fallback: try to extract time only (user might have just said "as 11")
                                            let timeMatch = diaHorario.match(/às\s*(\d{2})(\d{2})/i);
                                            if (!timeMatch) timeMatch = diaHorario.match(/(\d{1,2}):(\d{2})/);
                                            if (!timeMatch) timeMatch = diaHorario.match(/(\d{1,2})h(\d{2})?/);

                                            if (timeMatch && !toolArgs.horario_especifico) {
                                                const hours = timeMatch[1].padStart(2, '0');
                                                const minutes = (timeMatch[2] || '00').padStart(2, '0');
                                                toolArgs.horario_especifico = `${hours}:${minutes}`;
                                                console.log('[FSM Engine] Fallback extracted time:', toolArgs.horario_especifico);
                                            }

                                            // Fallback: try to extract DD/MM date
                                            if (!toolArgs.data_especifica) {
                                                const dateMatch = diaHorario.match(/(\d{1,2})\/(\d{1,2})/);
                                                if (dateMatch) {
                                                    const day = parseInt(dateMatch[1]);
                                                    const month = parseInt(dateMatch[2]);
                                                    const now = new Date();
                                                    let year = now.getFullYear();

                                                    // Check if date is in the past
                                                    const targetDate = new Date(year, month - 1, day);
                                                    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                                    if (targetDate < todayMidnight) {
                                                        year = year + 1;
                                                    }

                                                    toolArgs.data_especifica = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                                    console.log('[FSM Engine] Fallback extracted date:', toolArgs.data_especifica);
                                                }
                                            }
                                        }

                                        toolArgs.mensagem_original = diaHorario;
                                    }

                                    if (!toolArgs.acao) {
                                        // ==================== DETECT CANCEL/RESCHEDULE INTENT ====================
                                        const userMsgLower = input.lastMessage.toLowerCase();
                                        const cancelKeywords = ['cancelar', 'cancela', 'não quero mais', 'desmarcar', 'desmarque', 'desisto', 'não vou mais'];
                                        const rescheduleKeywords = ['reagendar', 'remarcar', 'mudar horário', 'mudar o horário', 'outro horário', 'trocar horário'];

                                        const wantsToCancel = cancelKeywords.some(kw => userMsgLower.includes(kw));
                                        const wantsToReschedule = rescheduleKeywords.some(kw => userMsgLower.includes(kw));

                                        if (wantsToCancel && !wantsToReschedule) {
                                            toolArgs.acao = 'cancelar';
                                            console.log('[FSM Engine] Auto-setting acao=cancelar (cancel intent detected in message)');
                                        } else if (wantsToReschedule) {
                                            if (toolArgs.data_especifica && toolArgs.horario_especifico) {
                                                toolArgs.acao = 'reagendar';
                                                console.log('[FSM Engine] Auto-setting acao=reagendar (reschedule intent with new date/time)');
                                            } else {
                                                // First cancel the existing, then suggest new times
                                                toolArgs.acao = 'sugerir_iniciais';
                                                console.log('[FSM Engine] Auto-setting acao=sugerir_iniciais (reschedule intent, need new times)');
                                            }
                                        } else if (toolArgs.data_especifica && toolArgs.horario_especifico) {
                                            toolArgs.acao = 'confirmar';
                                            console.log('[FSM Engine] Auto-setting acao=confirmar (date+time provided)');
                                        } else {
                                            toolArgs.acao = 'sugerir_iniciais';

                                            // CONTEXTUAL SUGGESTIONS: Infer periodo_dia from requested time
                                            // If client asked for "16h" (afternoon) but it's unavailable, suggest afternoon slots
                                            if (toolArgs.horario_especifico && !toolArgs.periodo_dia) {
                                                const requestedHour = parseInt(toolArgs.horario_especifico.split(':')[0]);
                                                if (requestedHour >= 6 && requestedHour < 12) {
                                                    toolArgs.periodo_dia = 'manha';
                                                } else if (requestedHour >= 12 && requestedHour < 18) {
                                                    toolArgs.periodo_dia = 'tarde';
                                                } else if (requestedHour >= 18) {
                                                    toolArgs.periodo_dia = 'noite';
                                                }
                                                console.log(`[FSM Engine] Inferred periodo_dia=${toolArgs.periodo_dia} from requested time ${toolArgs.horario_especifico}`);
                                            }

                                            // CONTEXTUAL SUGGESTIONS: Use requested date as reference
                                            // If client asked for "Wednesday" but the specific time is unavailable, 
                                            // suggest other times on/after Wednesday, not earlier days
                                            if (toolArgs.data_especifica && !toolArgs.data_referencia) {
                                                toolArgs.data_referencia = toolArgs.data_especifica;
                                                console.log(`[FSM Engine] Set data_referencia=${toolArgs.data_referencia} from requested date`);
                                            }

                                            console.log('[FSM Engine] Auto-setting acao=sugerir_iniciais (no date+time)', {
                                                periodo_dia: toolArgs.periodo_dia,
                                                data_referencia: toolArgs.data_referencia,
                                            });
                                        }
                                    }
                                } else {
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
                                        if (dateLower.includes('amanhã') || dateLower.includes('amanha')) date = 'amanhã';
                                        else if (dateLower.includes('segunda')) date = 'segunda-feira';
                                        else if (dateLower.includes('terça') || dateLower.includes('terca')) date = 'terça-feira';
                                        else if (dateLower.includes('quarta')) date = 'quarta-feira';
                                        else if (dateLower.includes('quinta')) date = 'quinta-feira';
                                        else if (dateLower.includes('sexta')) date = 'sexta-feira';
                                    }

                                    toolArgs = { date, time, notes: `Agendamento via IA - ${diaHorario}`, ...toolArgs };
                                }

                                const toolResult = await toolsHandler.executeFSMTool(
                                    toolName,
                                    toolArgs,
                                    {
                                        organizationId: input.organizationId,
                                        leadId: input.leadId,
                                        conversationId: input.conversationHistory[0]?.content || '',
                                    },
                                    {
                                        schedulingTools: this.schedulingToolsService,
                                        contractTools: this.contractToolsService,
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

                                // Mark scheduling tool as executed to prevent redundant cancelar_evento
                                if (toolResult.success && ['reagendar_evento', 'gerenciar_agenda', 'criar_evento'].includes(toolName)) {
                                    schedulingToolExecuted = true;
                                    console.log('[FSM Engine] Scheduling tool executed successfully, setting flag to prevent redundant cancellation');
                                }
                            }
                        }
                    } catch (error) {
                        console.error('[FSM Engine] Error executing tools:', error);
                        finalNextState = state.name;
                    }
                }

                const loopDetection = this.decisionValidator.detectStateLoop(
                    state.name,
                    decisionResult.estado_escolhido,
                    input.conversationHistory
                );

                if (loopDetection.hasLoop) {
                    validationResult.alertas.push(loopDetection.description);
                }

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

                // ==================== AUTO-SKIP STATES ====================
                // Pular estados cujos dataKeys já foram coletados
                if (validationResult.approved && finalNextState !== state.name) {
                    const allStates = await this.prisma.state.findMany({
                        where: { agentId: input.agentId },
                        select: {
                            name: true,
                            dataKey: true,
                            availableRoutes: true,
                        },
                    });

                    const skipResult = await this.stateDecider.findNextStateWithMissingData(
                        finalNextState,
                        allStates,
                        updatedExtractedData
                    );

                    if (skipResult.skippedStates.length > 0) {
                        console.log(`[FSM Engine] 🚀 Auto-skip: pulando ${skipResult.skippedStates.length} estados →`, skipResult.skippedStates);
                        decisionResult.pensamento.push(
                            `🚀 AUTO-SKIP: Estados pulados (dataKeys já coletados): ${skipResult.skippedStates.join(' → ')}`
                        );
                        decisionResult.pensamento.push(`📍 Novo destino: ${skipResult.nextState}`);
                        finalNextState = skipResult.nextState;
                    }
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

                // ==================== RESULTADO FINAL (Formatado Legado) ====================
                metrics.totalTime = Date.now() - startTime;

                const combinedReasoningSteps: string[] = [
                    ...knowledgeReasoningLines,
                    ...(extractionResult?.reasoning || []),
                    ...(decisionResult?.pensamento || []),
                    `Validação: ${validationResult?.approved ? 'APROVADA' : 'REJEITADA'}`,
                    ...(validationResult?.alertas?.map(a => `⚠️ ${a}`) || [])
                ];

                if (validationResult.justificativa) {
                    combinedReasoningSteps.push(`Justificativa: ${validationResult.justificativa}`);
                }

                // Formata como JSON "fake" para visualização legado
                const legacyFormattedOutput = [
                    '==============================',
                    'Pensamento 1',
                    '',
                    '',
                    `Estado atual: ${state.name}`,
                    '{',
                    '"pensamento": [',
                    ...combinedReasoningSteps.map((step, index) =>
                        `"${step.replace(/"/g, '\\"')}"${index < combinedReasoningSteps.length - 1 ? ',' : ''}`
                    ),
                    '],',
                    `"estado_escolhido": "${finalNextState}"`,
                    '}'
                ];

                const finalReasoning = legacyFormattedOutput;

                const output: DecisionOutput = {
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

            } catch (error) {
                lastError = error as Error;
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
