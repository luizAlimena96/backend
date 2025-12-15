"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideNextState = decideNextState;
const prisma_1 = require("@/app/lib/prisma");
const data_extractor_1 = require("./fsm-engine/data-extractor");
const state_decider_1 = require("./fsm-engine/state-decider");
const decision_validator_1 = require("./fsm-engine/decision-validator");
const timeout_protection_1 = require("./timeout-protection");
const types_1 = require("./fsm-engine/types");
const MAX_RETRIES = 2;
async function decideNextState(input) {
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
        const agent = await prisma_1.prisma.agent.findUnique({
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
        const state = await prisma_1.prisma.state.findFirst({
            where: {
                agentId: input.agentId,
                name: input.currentState,
            },
        });
        if (!state) {
            console.warn(`[FSM Engine] State '${input.currentState}' not found, using INICIO`);
            const inicioState = await prisma_1.prisma.state.findFirst({
                where: {
                    agentId: input.agentId,
                    name: 'INICIO',
                },
            });
            if (!inicioState) {
                throw new types_1.FSMEngineError('STATE_NOT_FOUND', `Estado '${input.currentState}' não encontrado e estado INICIO não existe`, { currentState: input.currentState }, false);
            }
            return await processState(inicioState, input, openaiApiKey, openaiModel, metrics, startTime, agentContext, {
                dataExtractor: input.customPrompts?.dataExtractor || agent.fsmDataExtractorPrompt,
                stateDecider: input.customPrompts?.stateDecider || agent.fsmStateDeciderPrompt,
                validator: input.customPrompts?.validator || agent.fsmValidatorPrompt,
            });
        }
        return await processState(state, input, openaiApiKey, openaiModel, metrics, startTime, agentContext, {
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
async function processState(state, input, openaiApiKey, openaiModel, metrics, startTime, agentContext, customPrompts) {
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
            const allStates = await prisma_1.prisma.state.findMany({
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
            const { extractAllDataFromMessage } = await Promise.resolve().then(() => require('./fsm-engine/data-extractor'));
            const globalExtractionResult = await extractAllDataFromMessage({
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
            let updatedExtractedData = {
                ...input.extractedData,
                ...globalExtractionResult.extractedData,
            };
            if (input.leadId && Object.keys(globalExtractionResult.extractedData).length > 0) {
                await prisma_1.prisma.lead.update({
                    where: { id: input.leadId },
                    data: {
                        extractedData: updatedExtractedData,
                    },
                });
                console.log('[FSM Engine] Saved', Object.keys(globalExtractionResult.extractedData).length, 'new data fields to lead');
            }
            input.extractedData = updatedExtractedData;
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
            const extractionResult = await (0, data_extractor_1.extractDataFromMessage)(extractionInput, openaiApiKey, openaiModel, customPrompts?.dataExtractor);
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
                const { searchKnowledge, formatKnowledgeContext, getKnowledgeStats } = await Promise.resolve().then(() => require('./knowledge-search'));
                const stats = await getKnowledgeStats(input.agentId, input.organizationId);
                knowledgeSearchInfo.chunksTotal = stats.totalChunks;
                knowledgeSearchInfo.chunksWithEmbeddings = stats.chunksWithEmbeddings;
                knowledgeSearchInfo.searched = true;
                const searchResults = await searchKnowledge(input.lastMessage, input.agentId, input.organizationId, openaiApiKey, { topK: 50, minSimilarity: 0.5 });
                knowledgeSearchInfo.chunksFound = searchResults.length;
                if (searchResults.length > 0) {
                    knowledgeSearchInfo.topSimilarity = searchResults[0].similarity;
                }
                console.log('[FSM Engine] Knowledge search completed', {
                    resultsCount: searchResults.length,
                    stats: knowledgeSearchInfo,
                    results: searchResults.map(r => ({
                        title: r.knowledgeTitle,
                        similarity: r.similarity?.toFixed(3),
                        contentPreview: r.content?.substring(0, 80)
                    }))
                });
                if (searchResults.length > 0) {
                    knowledgeContext = formatKnowledgeContext(searchResults);
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
            const decisionInput = {
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
            const decisionResult = await (0, state_decider_1.decideStateTransition)(decisionInput, openaiApiKey, openaiModel, customPrompts?.stateDecider);
            metrics.decisionTime = Date.now() - decisionStart;
            console.log('[FSM Engine] IA 2 (State Decider) completed', {
                nextState: decisionResult.estado_escolhido,
                veredito: decisionResult.veredito,
                rota: decisionResult.rota_escolhida,
                confianca: decisionResult.confianca,
            });
            const rulesValidation = (0, state_decider_1.validateDecisionRules)(decisionResult, decisionInput);
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
            const validationResult = await (0, decision_validator_1.validateDecision)(validationInput, openaiApiKey, openaiModel, customPrompts?.validator);
            metrics.validationTime = Date.now() - validationStart;
            console.log('[FSM Engine] IA 3 (Decision Validator) completed', {
                approved: validationResult.approved,
                confidence: validationResult.confidence,
                alertasCount: validationResult.alertas.length,
            });
            let finalNextState = validationResult.approved ? decisionResult.estado_escolhido : state.name;
            console.log(`[FSM Engine] Checking for tools in state '${state.name}'`, {
                hasTools: !!state.tools,
                toolsValue: state.tools,
                toolsType: typeof state.tools
            });
            if (state.tools && state.tools !== 'null' && state.tools !== '') {
                try {
                    const tools = typeof state.tools === 'string' ? JSON.parse(state.tools) : state.tools;
                    const toolsList = Array.isArray(tools) ? tools : [];
                    if (toolsList.length > 0) {
                        console.log(`[FSM Engine] State '${state.name}' has tools:`, toolsList);
                        const { executeFSMTool } = await Promise.resolve().then(() => require('./fsm-engine/tools-handler'));
                        for (const toolName of toolsList) {
                            console.log(`[FSM Engine] Executing tool: ${toolName}`);
                            const diaHorario = updatedExtractedData.dia_horário || updatedExtractedData.horario_escolhido || '';
                            console.log(`[FSM Engine] dia_horário value:`, diaHorario);
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
                                if (dateLower.includes('amanhã') || dateLower.includes('amanha')) {
                                    date = 'amanhã';
                                }
                                else if (dateLower.includes('segunda')) {
                                    date = 'segunda-feira';
                                }
                                else if (dateLower.includes('terça') || dateLower.includes('terca')) {
                                    date = 'terça-feira';
                                }
                                else if (dateLower.includes('quarta')) {
                                    date = 'quarta-feira';
                                }
                                else if (dateLower.includes('quinta')) {
                                    date = 'quinta-feira';
                                }
                                else if (dateLower.includes('sexta')) {
                                    date = 'sexta-feira';
                                }
                            }
                            const toolArgs = { date, time, notes: `Agendamento via IA - ${diaHorario}` };
                            console.log(`[FSM Engine] Tool arguments:`, toolArgs);
                            const toolResult = await executeFSMTool(toolName, toolArgs, {
                                organizationId: input.organizationId,
                                leadId: input.leadId,
                                conversationId: input.conversationHistory[0]?.content || '',
                            });
                            console.log(`[FSM Engine] Tool '${toolName}' result:`, toolResult);
                            decisionResult.pensamento.push(`🔧 Ferramenta executada: ${toolName}`, toolResult.success ? `✅ ${toolResult.message}` : `❌ ${toolResult.message}`);
                            if (!toolResult.success) {
                                validationResult.alertas.push(`Ferramenta '${toolName}' falhou: ${toolResult.error}`);
                                console.warn(`[FSM Engine] Tool '${toolName}' failed. Blocking transition to '${finalNextState}'.`);
                                finalNextState = state.name;
                            }
                            if (toolResult.success && toolResult.data) {
                                console.log(`[FSM Engine] Tool '${toolName}' returned data:`, toolResult.data);
                                updatedExtractedData = {
                                    ...updatedExtractedData,
                                    ...toolResult.data
                                };
                                await prisma_1.prisma.lead.update({
                                    where: { id: input.leadId },
                                    data: { extractedData: updatedExtractedData }
                                });
                            }
                        }
                    }
                }
                catch (error) {
                    console.error('[FSM Engine] Error executing tools:', error);
                    finalNextState = state.name;
                }
            }
            const loopDetection = (0, decision_validator_1.detectStateLoop)(state.name, decisionResult.estado_escolhido, input.conversationHistory);
            if (loopDetection.hasLoop) {
                validationResult.alertas.push(loopDetection.description);
            }
            const isValid = (0, decision_validator_1.isValidTransition)(state.name, decisionResult.estado_escolhido, routes);
            if (!isValid) {
                validationResult.alertas.push(`Transição inválida: ${state.name} → ${decisionResult.estado_escolhido}`);
            }
            if (!validationResult.approved && validationResult.retryable && retryCount < MAX_RETRIES) {
                retryCount++;
                const backoffMs = (0, timeout_protection_1.calculateBackoff)(retryCount - 1);
                console.warn(`[FSM Engine] Validation failed, retrying (${retryCount}/${MAX_RETRIES}) after ${backoffMs}ms`, {
                    justificativa: validationResult.justificativa,
                });
                lastError = new Error(validationResult.justificativa);
                await (0, timeout_protection_1.delay)(backoffMs);
                continue;
            }
            metrics.totalTime = Date.now() - startTime;
            const knowledgeReasoningLines = [];
            knowledgeReasoningLines.push('📚 BASE DE CONHECIMENTO:');
            if (!knowledgeSearchInfo.searched) {
                knowledgeReasoningLines.push('  ❌ Busca não realizada (erro)');
                if (knowledgeSearchInfo.errorMessage) {
                    knowledgeReasoningLines.push(`  Erro: ${knowledgeSearchInfo.errorMessage}`);
                }
            }
            else if (knowledgeSearchInfo.chunksTotal === 0) {
                knowledgeReasoningLines.push('  ⚠️ Nenhum conhecimento cadastrado para este agente');
                knowledgeReasoningLines.push('  → Faça upload de documentos na aba "Conhecimento"');
            }
            else if (knowledgeSearchInfo.chunksWithEmbeddings === 0) {
                knowledgeReasoningLines.push(`  ⚠️ ${knowledgeSearchInfo.chunksTotal} chunks encontrados, MAS SEM EMBEDDINGS`);
                knowledgeReasoningLines.push('  → Os embeddings podem ter falhado durante o upload');
                knowledgeReasoningLines.push('  → Tente re-fazer o upload do documento');
            }
            else if (knowledgeSearchInfo.chunksFound === 0) {
                knowledgeReasoningLines.push(`  ℹ️ ${knowledgeSearchInfo.chunksWithEmbeddings}/${knowledgeSearchInfo.chunksTotal} chunks com embeddings`);
                knowledgeReasoningLines.push(`  ⚠️ Nenhum chunk relevante encontrado (similaridade < 0.5)`);
                knowledgeReasoningLines.push(`  → A pergunta pode não ter relação com o conteúdo cadastrado`);
            }
            else {
                knowledgeReasoningLines.push(`  ✅ CONHECIMENTO UTILIZADO: ${knowledgeSearchInfo.chunksFound} chunks relevantes`);
                knowledgeReasoningLines.push(`  Similaridade máxima: ${(knowledgeSearchInfo.topSimilarity * 100).toFixed(1)}%`);
                knowledgeReasoningLines.push(`  Total na base: ${knowledgeSearchInfo.chunksWithEmbeddings}/${knowledgeSearchInfo.chunksTotal} chunks com embeddings`);
            }
            const output = {
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
                extractedData: extractionResult.data,
                validation: validationResult,
                shouldExtractData: extractionResult.success && extractionResult.metadata.extractedFields.length > 0,
                dataToExtract: state.dataKey,
                knowledgeContext: knowledgeContext || undefined,
                metrics,
            };
            console.log('[FSM Engine] Decision process completed', {
                totalTime: metrics.totalTime,
                nextState: output.nextState,
                approved: validationResult.approved,
            });
            return output;
        }
        catch (error) {
            lastError = error;
            console.error(`[FSM Engine] Error in attempt ${retryCount + 1}:`, error);
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                const backoffMs = (0, timeout_protection_1.calculateBackoff)(retryCount - 1);
                console.warn(`[FSM Engine] Retrying after error in ${backoffMs}ms (${retryCount}/${MAX_RETRIES})`);
                await (0, timeout_protection_1.delay)(backoffMs);
                continue;
            }
            break;
        }
    }
    metrics.totalTime = Date.now() - startTime;
    const isGreeting = input.lastMessage.trim().length < 20 &&
        input.conversationHistory.length <= 2;
    const greetingKeywords = ['ola', 'olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'hello'];
    const containsGreeting = greetingKeywords.some(keyword => input.lastMessage.toLowerCase().includes(keyword));
    if (isGreeting && containsGreeting) {
        console.log('[FSM Engine] Detected greeting, returning clean welcome message');
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
            metrics,
        };
    }
    const errorKnowledgeLines = [];
    errorKnowledgeLines.push('📚 BASE DE CONHECIMENTO:');
    if (!knowledgeSearchInfo.searched) {
        errorKnowledgeLines.push('  ❌ Busca não realizada (erro)');
        if (knowledgeSearchInfo.errorMessage) {
            errorKnowledgeLines.push(`  Erro: ${knowledgeSearchInfo.errorMessage}`);
        }
    }
    else if (knowledgeSearchInfo.chunksTotal === 0) {
        errorKnowledgeLines.push('  ⚠️ Nenhum conhecimento cadastrado para este agente');
    }
    else if (knowledgeSearchInfo.chunksWithEmbeddings === 0) {
        errorKnowledgeLines.push(`  ⚠️ ${knowledgeSearchInfo.chunksTotal} chunks SEM EMBEDDINGS`);
    }
    else if (knowledgeSearchInfo.chunksFound === 0) {
        errorKnowledgeLines.push(`  ℹ️ ${knowledgeSearchInfo.chunksWithEmbeddings}/${knowledgeSearchInfo.chunksTotal} chunks com embeddings`);
        errorKnowledgeLines.push(`  ⚠️ Nenhum chunk relevante (similaridade < 0.5)`);
    }
    else {
        errorKnowledgeLines.push(`  ✅ ${knowledgeSearchInfo.chunksFound} chunks relevantes encontrados`);
        errorKnowledgeLines.push(`  Similaridade máxima: ${(knowledgeSearchInfo.topSimilarity * 100).toFixed(1)}%`);
    }
    return {
        nextState: state.name,
        reasoning: [
            ...errorKnowledgeLines,
            '---',
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
//# sourceMappingURL=fsm-engine.js.map