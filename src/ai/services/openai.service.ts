import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
    async createChatCompletion(
        apiKey: string,
        model: string,
        messages: Array<{ role: string; content: string }>,
        options?: {
            temperature?: number;
            maxTokens?: number;
            responseFormat?: { type: 'json_object' | 'text' };
        }
    ): Promise<string> {
        const openai = new OpenAI({ apiKey });

        const completionOptions: any = {
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

    async transcribeAudio(apiKey: string, audioBase64: string): Promise<string> {
        const openai = new OpenAI({ apiKey });

        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

        const transcription = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'pt',
        });

        return transcription.text;
    }

    async createEmbedding(apiKey: string, text: string): Promise<number[]> {
        const openai = new OpenAI({ apiKey });

        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });

        return response.data[0].embedding;
    }
}
