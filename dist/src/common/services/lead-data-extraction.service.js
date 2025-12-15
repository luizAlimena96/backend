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
exports.LeadDataExtractionService = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("../../ai/services/openai.service");
let LeadDataExtractionService = class LeadDataExtractionService {
    openaiService;
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async extractLeadData(message, apiKey) {
        try {
            const prompt = `Extraia informações de contato desta mensagem:
"${message}"

Retorne em JSON:
{
  "nome": "nome completo se mencionado",
  "email": "email se mencionado",
  "telefone": "telefone se mencionado",
  "empresa": "empresa se mencionada",
  "cargo": "cargo se mencionado"
}

Se algum campo não for mencionado, retorne null.`;
            const response = await this.openaiService.createChatCompletion(apiKey, 'gpt-4o-mini', [
                {
                    role: 'system',
                    content: 'Você é um extrator de dados. Responda SEMPRE em JSON válido.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ], {
                maxTokens: 200,
                responseFormat: { type: 'json_object' },
            });
            return JSON.parse(response);
        }
        catch (error) {
            console.error('Lead data extraction error:', error);
            return {};
        }
    }
};
exports.LeadDataExtractionService = LeadDataExtractionService;
exports.LeadDataExtractionService = LeadDataExtractionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService])
], LeadDataExtractionService);
//# sourceMappingURL=lead-data-extraction.service.js.map