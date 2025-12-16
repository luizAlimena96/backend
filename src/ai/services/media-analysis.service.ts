import { Injectable } from '@nestjs/common';
import { OpenAIService } from './openai.service';

@Injectable()
export class MediaAnalysisService {
    constructor(private openaiService: OpenAIService) { }

    async analyzeImage(base64Image: string, apiKey: string, customPrompt?: string): Promise<{ success: boolean; content: string }> {
        try {
            console.log('[Media Analysis] Analyzing image with GPT-4o Vision...');

            const prompt = customPrompt || 'Analise esta imagem em detalhes em português. Se houver texto, transcreva-o. Descreva o conteúdo visual de forma clara e objetiva.';

            // Convert base64 to Buffer as required by openaiService.analyzeImage
            const imageBuffer = Buffer.from(base64Image, 'base64');

            const response = await this.openaiService.analyzeImage(
                apiKey,
                imageBuffer,
                prompt
            );

            console.log('[Media Analysis] Image analyzed successfully');
            return { success: true, content: response };
        } catch (error) {
            console.error('[Media Analysis] Error analyzing image:', error);
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
