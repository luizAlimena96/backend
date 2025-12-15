import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../../ai/services/openai.service';

@Injectable()
export class LeadDataExtractionService {
    constructor(private openaiService: OpenAIService) { }

    async extractLeadData(message: string, apiKey: string): Promise<any> {
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

            const response = await this.openaiService.createChatCompletion(
                apiKey,
                'gpt-4o-mini',
                [
                    {
                        role: 'system',
                        content: 'Você é um extrator de dados. Responda SEMPRE em JSON válido.',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                {
                    maxTokens: 200,
                    responseFormat: { type: 'json_object' },
                }
            );

            return JSON.parse(response);
        } catch (error) {
            console.error('Lead data extraction error:', error);
            return {};
        }
    }
}
