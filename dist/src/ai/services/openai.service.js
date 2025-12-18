"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
let OpenAIService = class OpenAIService {
    async chat(apiKey, messages, model = 'gpt-4o-mini') {
        const openai = new openai_1.default({ apiKey });
        const response = await openai.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
        });
        return response.choices[0].message.content || '';
    }
    async chatWithTools(apiKey, messages, tools, model = 'gpt-4o-mini') {
        const openai = new openai_1.default({ apiKey });
        const response = await openai.chat.completions.create({
            model,
            messages,
            tools,
            tool_choice: 'auto',
        });
        return response.choices[0].message.content || '';
    }
    async createChatCompletion(apiKey, model, messages, options) {
        const openai = new openai_1.default({ apiKey });
        const completionOptions = {
            model,
            messages,
            temperature: options?.temperature || 0.7,
            max_tokens: options?.maxTokens || 1000,
        };
        if (options?.responseFormat) {
            completionOptions.response_format = options.responseFormat;
        }
        const response = await openai.chat.completions.create(completionOptions);
        return response.choices[0].message.content || '';
    }
    async transcribeAudio(apiKey, audioBase64) {
        const openai = new openai_1.default({ apiKey });
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const file = await openai_1.default.toFile(audioBuffer, 'audio.ogg', { type: 'audio/ogg' });
        const transcription = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'pt',
            prompt: 'Mensagem de voz do WhatsApp em português brasileiro. Transcreva exatamente o que foi dito, incluindo cumprimentos, perguntas e conversação natural.',
        });
        return transcription.text;
    }
    async createEmbedding(apiKey, text) {
        const openai = new openai_1.default({ apiKey });
        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
            dimensions: 1536,
        });
        return response.data[0].embedding;
    }
    async analyzeImage(apiKey, imageBuffer, prompt) {
        const openai = new openai_1.default({ apiKey });
        const base64Image = imageBuffer.toString('base64');
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 300,
        });
        return response.choices[0].message.content || '';
    }
};
exports.OpenAIService = OpenAIService;
exports.OpenAIService = OpenAIService = __decorate([
    (0, common_1.Injectable)()
], OpenAIService);
//# sourceMappingURL=openai.service.js.map