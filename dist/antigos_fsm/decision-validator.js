"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDecision = validateDecision;
exports.detectStateLoop = detectStateLoop;
exports.isValidTransition = isValidTransition;
const openai_1 = require("openai");
const types_1 = require("./types");
const prompts_1 = require("./prompts");
async function validateDecision(input, openaiApiKey, model = 'gpt-4o-mini', customPrompt) {
    const startTime = Date.now();
    try {
        const openai = new openai_1.OpenAI({ apiKey: openaiApiKey });
        const prompt = (0, prompts_1.buildDecisionValidatorPrompt)(input, customPrompt);
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'Você é um validador de decisões. Retorne APENAS JSON válido, sem markdown ou texto adicional.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });
        const responseText = completion.choices[0]?.message?.content;
        if (!responseText) {
            throw new types_1.FSMEngineError('VALIDATION_NO_RESPONSE', 'IA não retornou resposta', { input }, true);
        }
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        }
        catch (parseError) {
            console.error('[Decision Validator] JSON parse error:', parseError);
            console.error('[Decision Validator] Malformed JSON:', responseText.substring(0, 500));
            throw new types_1.FSMEngineError('VALIDATION_INVALID_JSON', 'JSON mal formatado retornado pela IA', { responseText: responseText.substring(0, 200), error: parseError }, true);
        }
        if (typeof parsed.approved !== 'boolean' ||
            typeof parsed.confidence !== 'number' ||
            !parsed.justificativa ||
            !Array.isArray(parsed.alertas) ||
            typeof parsed.retryable !== 'boolean') {
            throw new types_1.FSMEngineError('VALIDATION_INVALID_FORMAT', 'Formato de resposta inválido da IA', { response: parsed }, true);
        }
        const result = {
            approved: parsed.approved,
            confidence: Math.max(0, Math.min(1, parsed.confidence)),
            justificativa: parsed.justificativa,
            alertas: parsed.alertas,
            retryable: parsed.retryable,
            suggestedState: parsed.suggestedState,
        };
        console.log(`[Decision Validator] Completed in ${Date.now() - startTime}ms`, {
            approved: result.approved,
            confidence: result.confidence,
            alertasCount: result.alertas.length,
            retryable: result.retryable,
        });
        return result;
    }
    catch (error) {
        console.error('[Decision Validator] Error:', error);
        if (error instanceof types_1.FSMEngineError) {
            throw error;
        }
        return {
            approved: true,
            confidence: 0.3,
            justificativa: `Erro ao validar decisão: ${error instanceof Error ? error.message : 'Erro desconhecido'}. Aprovando por padrão com baixa confiança.`,
            alertas: ['Erro no validador - validação comprometida'],
            retryable: false,
        };
    }
}
function detectStateLoop(currentState, proposedNextState, conversationHistory) {
    if (currentState === proposedNextState) {
        return {
            hasLoop: true,
            loopCount: 1,
            description: `Permanecendo no mesmo estado: ${currentState}`,
        };
    }
    return {
        hasLoop: false,
        loopCount: 0,
        description: 'Nenhum loop detectado',
    };
}
function isValidTransition(currentState, nextState, availableRoutes) {
    const allStates = [
        ...availableRoutes.rota_de_sucesso.map(r => r.estado),
        ...availableRoutes.rota_de_persistencia.map(r => r.estado),
        ...availableRoutes.rota_de_escape.map(r => r.estado),
    ];
    return allStates.includes(nextState) || nextState === 'ERRO';
}
//# sourceMappingURL=decision-validator.js.map