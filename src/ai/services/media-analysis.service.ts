import { Injectable } from '@nestjs/common';
import { OpenAIService } from './openai.service';

@Injectable()
export class MediaAnalysisService {
    constructor(private openaiService: OpenAIService) { }

    async analyzeImage(base64Image: string, apiKey: string): Promise<{ success: boolean; content: string }> {
        try {
            return { success: true, content: 'Imagem recebida e processada.' };
        } catch (error) {
            console.error('Error analyzing image:', error);
            return { success: false, content: 'Erro ao analisar imagem' };
        }
    }

    async analyzeDocument(
        base64PDF: string,
        fileName: string,
        mimeType: string,
        apiKey: string
    ): Promise<{ success: boolean; content: string }> {
        try {
            const pdfBuffer = Buffer.from(base64PDF, 'base64');
            return {
                success: true,
                content: `Documento PDF recebido: ${fileName}. Tamanho: ${pdfBuffer.length} bytes.`,
            };
        } catch (error) {
            console.error('Error analyzing document:', error);
            return { success: false, content: 'Erro ao analisar documento' };
        }
    }

    processVideo(fileName?: string): { content: string } {
        return {
            content: `Vídeo recebido${fileName ? `: ${fileName}` : ''}. Análise de vídeo não disponível no momento.`,
        };
    }

    getUnsupportedFormatMessage(): string {
        return 'Desculpe, mas só consigo processar arquivos em formato PDF. Por favor, envie seu documento em PDF.';
    }
}
