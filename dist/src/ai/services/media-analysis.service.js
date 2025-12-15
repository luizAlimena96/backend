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
exports.MediaAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const openai_service_1 = require("./openai.service");
let MediaAnalysisService = class MediaAnalysisService {
    openaiService;
    constructor(openaiService) {
        this.openaiService = openaiService;
    }
    async analyzeImage(base64Image, apiKey) {
        try {
            return { success: true, content: 'Imagem recebida e processada.' };
        }
        catch (error) {
            console.error('Error analyzing image:', error);
            return { success: false, content: 'Erro ao analisar imagem' };
        }
    }
    async analyzeDocument(base64PDF, fileName, mimeType, apiKey) {
        try {
            const pdfBuffer = Buffer.from(base64PDF, 'base64');
            return {
                success: true,
                content: `Documento PDF recebido: ${fileName}. Tamanho: ${pdfBuffer.length} bytes.`,
            };
        }
        catch (error) {
            console.error('Error analyzing document:', error);
            return { success: false, content: 'Erro ao analisar documento' };
        }
    }
    processVideo(fileName) {
        return {
            content: `Vídeo recebido${fileName ? `: ${fileName}` : ''}. Análise de vídeo não disponível no momento.`,
        };
    }
    getUnsupportedFormatMessage() {
        return 'Desculpe, mas só consigo processar arquivos em formato PDF. Por favor, envie seu documento em PDF.';
    }
};
exports.MediaAnalysisService = MediaAnalysisService;
exports.MediaAnalysisService = MediaAnalysisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openai_service_1.OpenAIService])
], MediaAnalysisService);
//# sourceMappingURL=media-analysis.service.js.map