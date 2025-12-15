"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDataFromMessage = extractDataFromMessage;
exports.validateDataType = validateDataType;
exports.extractAllDataFromMessage = extractAllDataFromMessage;
const openai_1 = require("openai");
const types_1 = require("./types");
const prompts_1 = require("./prompts");
async function extractDataFromMessage(input, openaiApiKey, model = 'gpt-4o-mini', customPrompt) {
    const startTime = Date.now();
    try {
        if (!input.dataKey || input.dataKey === 'vazio') {
            return {
                success: true,
                data: {},
                confidence: 1.0,
                metadata: {
                    extractedAt: new Date(),
                    dataKey: input.dataKey,
                    dataType: input.dataType,
                    extractedFields: [],
                },
                reasoning: ['Nenhum dado específico para extrair neste estado.'],
            };
        }
        const openai = new openai_1.OpenAI({ apiKey: openaiApiKey });
        const prompt = (0, prompts_1.buildDataExtractorPrompt)(input, customPrompt);
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'Você é um extrator de dados especializado. Retorne APENAS JSON válido, sem markdown ou texto adicional.',
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
            throw new types_1.FSMEngineError('EXTRACTION_NO_RESPONSE', 'IA não retornou resposta', { input }, true);
        }
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        }
        catch (parseError) {
            console.error('[Data Extractor] JSON parse error:', parseError);
            console.error('[Data Extractor] Malformed JSON:', responseText.substring(0, 500));
            throw new types_1.FSMEngineError('EXTRACTION_INVALID_JSON', 'JSON mal formatado retornado pela IA', { responseText: responseText.substring(0, 200), error: parseError }, true);
        }
        console.log('[Data Extractor] AI returned:', JSON.stringify(parsed, null, 2));
        let extractedData;
        let confidence;
        let reasoning;
        if (parsed.data !== undefined) {
            extractedData = parsed.data || {};
            confidence = parsed.confidence || 0.8;
            reasoning = Array.isArray(parsed.reasoning) ? parsed.reasoning : [parsed.reasoning || 'Dados extraídos'];
        }
        else {
            extractedData = {};
            for (const [key, value] of Object.entries(parsed)) {
                if (key !== 'confidence' && key !== 'reasoning') {
                    extractedData[key] = value;
                }
            }
            confidence = parsed.confidence || 0.8;
            reasoning = Array.isArray(parsed.reasoning) ? parsed.reasoning : ['Dados extraídos diretamente'];
        }
        const mergedData = {
            ...input.currentExtractedData,
            ...extractedData,
        };
        const result = {
            success: true,
            data: mergedData,
            confidence: confidence,
            metadata: {
                extractedAt: new Date(),
                dataKey: input.dataKey,
                dataType: input.dataType,
                extractedFields: Object.keys(extractedData),
            },
            reasoning: reasoning,
        };
        console.log(`[Data Extractor] Completed in ${Date.now() - startTime}ms`, {
            dataKey: input.dataKey,
            confidence: result.confidence,
            extractedFields: result.metadata.extractedFields,
        });
        return result;
    }
    catch (error) {
        console.error('[Data Extractor] Error:', error);
        if (error instanceof types_1.FSMEngineError) {
            throw error;
        }
        return {
            success: false,
            data: input.currentExtractedData,
            confidence: 0.0,
            metadata: {
                extractedAt: new Date(),
                dataKey: input.dataKey,
                dataType: input.dataType,
                extractedFields: [],
            },
            reasoning: [
                'Erro ao extrair dados da mensagem.',
                error instanceof Error ? error.message : 'Erro desconhecido',
            ],
        };
    }
}
function validateDataType(value, expectedType) {
    if (!expectedType)
        return true;
    switch (expectedType.toLowerCase()) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number';
        case 'boolean':
            return typeof value === 'boolean';
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && !Array.isArray(value);
        default:
            return true;
    }
}
async function extractAllDataFromMessage(input, openaiApiKey, model = 'gpt-4o-mini') {
    const startTime = Date.now();
    try {
        if (!input.allDataKeys || input.allDataKeys.length === 0) {
            return {
                success: true,
                extractedData: {},
                confidence: {},
                metadata: {
                    extractedAt: new Date(),
                    totalDataKeys: 0,
                    extractedCount: 0,
                    extractedFields: [],
                },
                reasoning: ['Nenhum dataKey disponível para extração.'],
            };
        }
        const openai = new openai_1.OpenAI({ apiKey: openaiApiKey });
        const dataKeysDescription = input.allDataKeys
            .map(dk => `- **${dk.key}**: ${dk.description} (tipo: ${dk.type})`)
            .join('\n');
        const prompt = `Você é um extrator de dados especializado. Analise a mensagem e extraia TODOS os dados possíveis.

DADOS DISPONÍVEIS PARA EXTRAÇÃO:
${dataKeysDescription}

DADOS JÁ COLETADOS:
${JSON.stringify(input.currentExtractedData, null, 2)}

MENSAGEM DO USUÁRIO:
"${input.message}"

REGRAS:
1. Tente extrair TODOS os dados que encontrar na mensagem
2. Se um dado não estiver presente, não o inclua no resultado
3. Normalize os valores conforme o tipo esperado:
   - string: texto limpo
   - number: apenas números (ex: "60 mil" → 60000)
   - boolean: true/false
4. Retorne apenas os dados que você tem ALTA confiança (>0.7)
5. NÃO extraia dados que já existem em DADOS JÁ COLETADOS com valores válidos

FORMATO DE SAÍDA (JSON):
{
  "extractedData": {
    "nome_cliente": "João",
    "valor_divida": 60000
  },
  "confidence": {
    "nome_cliente": 1.0,
    "valor_divida": 0.9
  },
  "reasoning": [
    "Cliente mencionou nome: João",
    "Cliente mencionou valor: 60 mil → convertido para 60000"
  ]
}`;
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                {
                    role: 'system',
                    content: 'Você é um extrator de dados especializado. Retorne APENAS JSON válido, sem markdown ou texto adicional.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' },
        });
        const responseText = completion.choices[0]?.message?.content || '{}';
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        }
        catch (parseError) {
            console.error('[Global Data Extractor] JSON parse error:', parseError);
            console.error('[Global Data Extractor] Malformed JSON:', responseText.substring(0, 500));
            return {
                success: false,
                extractedData: {},
                confidence: {},
                metadata: {
                    extractedAt: new Date(),
                    totalDataKeys: input.allDataKeys.length,
                    extractedCount: 0,
                    extractedFields: [],
                },
                reasoning: [`Erro ao parsear JSON: ${parseError instanceof Error ? parseError.message : 'Unknown'}`],
            };
        }
        const extractedData = parsed.extractedData || {};
        const confidence = parsed.confidence || {};
        const reasoning = parsed.reasoning || [];
        const filteredData = {};
        const filteredConfidence = {};
        for (const [key, value] of Object.entries(extractedData)) {
            const conf = confidence[key] || 0;
            if (conf >= 0.7) {
                filteredData[key] = value;
                filteredConfidence[key] = conf;
            }
        }
        return {
            success: true,
            extractedData: filteredData,
            confidence: filteredConfidence,
            metadata: {
                extractedAt: new Date(),
                totalDataKeys: input.allDataKeys.length,
                extractedCount: Object.keys(filteredData).length,
                extractedFields: Object.keys(filteredData),
            },
            reasoning,
        };
    }
    catch (error) {
        console.error('[Global Data Extractor] Error:', error);
        return {
            success: false,
            extractedData: {},
            confidence: {},
            metadata: {
                extractedAt: new Date(),
                totalDataKeys: input.allDataKeys.length,
                extractedCount: 0,
                extractedFields: [],
            },
            reasoning: [`Erro na extração: ${error.message}`],
        };
    }
}
//# sourceMappingURL=data-extractor.js.map