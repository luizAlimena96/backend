"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideStateTransition = decideStateTransition;
exports.validateDecisionRules = validateDecisionRules;
exports.shouldSkipState = shouldSkipState;
exports.findNextStateWithMissingData = findNextStateWithMissingData;
const openai_1 = require("openai");
const types_1 = require("./types");
const prompts_1 = require("./prompts");
async function decideStateTransition(input, openaiApiKey, model = 'gpt-4o-mini', customPrompt) {
    const startTime = Date.now();
    try {
        const openai = new openai_1.OpenAI({ apiKey: openaiApiKey });
        const prompt = (0, prompts_1.buildStateDeciderPrompt)(input, customPrompt);
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'Você é um autômato de execução lógica. Retorne APENAS JSON válido conforme as instruções, sem markdown ou texto adicional.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.0,
            response_format: { type: 'json_object' },
        });
        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new types_1.FSMEngineError('DECISION_NO_RESPONSE', 'IA não retornou resposta', { input }, true);
        }
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        }
        catch (parseError) {
            console.error('[State Decider] JSON parse error:', parseError);
            console.error('[State Decider] Malformed JSON:', responseText.substring(0, 500));
            throw new types_1.FSMEngineError('DECISION_INVALID_JSON', 'JSON mal formatado retornado pela IA', { responseText: responseText.substring(0, 200), error: parseError }, true);
        }
        console.log('[State Decider] AI Response:', JSON.stringify(parsed, null, 2));
        if (!parsed.pensamento) {
            console.warn('[State Decider] Campo "pensamento" ausente, criando vazio');
            parsed.pensamento = ['Resposta sem pensamento detalhado'];
        }
        if (!Array.isArray(parsed.pensamento)) {
            console.warn('[State Decider] Campo "pensamento" não é array, convertendo');
            parsed.pensamento = [String(parsed.pensamento)];
        }
        if (!parsed.estado_escolhido) {
            console.warn('[State Decider] Campo "estado_escolhido" ausente, mantendo estado atual');
            parsed.estado_escolhido = input.currentState;
        }
        if (!parsed.veredito) {
            console.warn('[State Decider] Campo "veredito" ausente, usando PENDENTE');
            parsed.veredito = 'PENDENTE';
        }
        if (!parsed.rota_escolhida) {
            console.warn('[State Decider] Campo "rota_escolhida" ausente, usando rota_de_persistencia');
            parsed.rota_escolhida = 'rota_de_persistencia';
        }
        const allStates = [
            ...input.availableRoutes.rota_de_sucesso.map(r => r.estado),
            ...input.availableRoutes.rota_de_persistencia.map(r => r.estado),
            ...input.availableRoutes.rota_de_escape.map(r => r.estado),
        ];
        if (!allStates.includes(parsed.estado_escolhido) && parsed.estado_escolhido !== 'ERRO') {
            console.warn('[State Decider] Estado escolhido não existe nas rotas disponíveis:', {
                estadoEscolhido: parsed.estado_escolhido,
                estadosDisponiveis: allStates,
            });
        }
        const vereditosValidos = ['SUCESSO', 'FALHA', 'PENDENTE', 'ERRO'];
        if (!vereditosValidos.includes(parsed.veredito)) {
            parsed.veredito = 'PENDENTE';
        }
        const rotasValidas = ['rota_de_sucesso', 'rota_de_persistencia', 'rota_de_escape'];
        if (!rotasValidas.includes(parsed.rota_escolhida)) {
            parsed.rota_escolhida = 'rota_de_persistencia';
        }
        const result = {
            pensamento: parsed.pensamento,
            estado_escolhido: parsed.estado_escolhido,
            veredito: parsed.veredito,
            rota_escolhida: parsed.rota_escolhida,
            confianca: parsed.confianca || 0.8,
        };
        console.log(`[State Decider] Completed in ${Date.now() - startTime}ms`, {
            currentState: input.currentState,
            nextState: result.estado_escolhido,
            veredito: result.veredito,
            rota: result.rota_escolhida,
            confianca: result.confianca,
        });
        return result;
    }
    catch (error) {
        console.error('[State Decider] Error:', error);
        if (error instanceof types_1.FSMEngineError) {
            throw error;
        }
        return {
            pensamento: [
                'Erro crítico no motor de decisão.',
                error instanceof Error ? error.message : 'Erro desconhecido',
                'Mantendo estado atual por segurança.',
            ],
            estado_escolhido: input.currentState,
            veredito: 'ERRO',
            rota_escolhida: 'rota_de_persistencia',
            confianca: 0.0,
        };
    }
}
function validateDecisionRules(decision, input) {
    const errors = [];
    if (decision.veredito === 'SUCESSO' && decision.rota_escolhida !== 'rota_de_sucesso') {
        errors.push('Veredito SUCESSO deve escolher rota_de_sucesso');
    }
    if (decision.veredito === 'FALHA' && decision.rota_escolhida === 'rota_de_sucesso') {
        errors.push('Veredito FALHA não pode escolher rota_de_sucesso');
    }
    const rotaEscolhida = input.availableRoutes[decision.rota_escolhida];
    const estadoExiste = rotaEscolhida.some(r => r.estado === decision.estado_escolhido);
    if (!estadoExiste && decision.estado_escolhido !== 'ERRO') {
        errors.push(`Estado ${decision.estado_escolhido} não existe na ${decision.rota_escolhida}`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
function shouldSkipState(stateName, stateDataKey, extractedData) {
    if (!stateDataKey || stateDataKey === 'vazio') {
        return false;
    }
    const value = extractedData[stateDataKey];
    if (value === null || value === undefined || value === '') {
        return false;
    }
    console.log(`[State Decider] Estado '${stateName}' será pulado - dataKey '${stateDataKey}' já coletado:`, value);
    return true;
}
async function findNextStateWithMissingData(proposedState, allStates, extractedData, maxDepth = 10) {
    const skippedStates = [];
    let currentState = proposedState;
    let depth = 0;
    while (depth < maxDepth) {
        const stateInfo = allStates.find(s => s.name === currentState);
        if (!stateInfo) {
            break;
        }
        if (shouldSkipState(currentState, stateInfo.dataKey, extractedData)) {
            skippedStates.push(currentState);
            const routes = stateInfo.availableRoutes;
            const successRoute = routes?.rota_de_sucesso;
            if (successRoute && successRoute.length > 0) {
                currentState = successRoute[0].estado;
                depth++;
            }
            else {
                break;
            }
        }
        else {
            break;
        }
    }
    if (skippedStates.length > 0) {
        console.log(`[State Decider] Pulados ${skippedStates.length} estados:`, skippedStates);
        console.log(`[State Decider] Próximo estado válido: ${currentState}`);
    }
    return {
        nextState: currentState,
        skippedStates,
    };
}
//# sourceMappingURL=state-decider.js.map