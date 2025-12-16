import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
    async chat(apiKey: string, messages: any[], model: string = 'gpt-4o-mini'): Promise<string> {
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
        });

        return response.choices[0].message.content || '';
    }

    async chatWithTools(
        apiKey: string,
        messages: any[],
        tools: any[],
        model: string = 'gpt-4o-mini'
    ): Promise<any> {
        const openai = new OpenAI({ apiKey });

        const response = await openai.chat.completions.create({
            model,
            messages,
            tools,
            tool_choice: 'auto',
        });

        return response.choices[0].message.content || '';
    }

    // Alias for backward compatibility with existing code
    async createChatCompletion(
        apiKey: string,
        model: string,
        messages: any[],
        options?: {
            temperature?: number;
            maxTokens?: number;
            responseFormat?: any;
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

    // EXACT legacy implementation that was working
    async transcribeAudio(apiKey: string, audioBase64: string): Promise<string> {
        const openai = new OpenAI({ apiKey });

        const audioBuffer = Buffer.from(audioBase64, 'base64');
        const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

        const transcription = await openai.audio.transcriptions.create({
            file,
            model: 'whisper-1',
            language: 'pt',
            prompt: 'Mensagem de voz do WhatsApp em português brasileiro. Transcreva exatamente o que foi dito, incluindo cumprimentos, perguntas e conversação natural.',
        });

        return transcription.text;
    }

    async createEmbedding(apiKey: string, text: string): Promise<number[]> {
        const openai = new OpenAI({ apiKey });

        const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
            dimensions: 1536,
        });

        return response.data[0].embedding;
    }

    async analyzeImage(apiKey: string, imageBuffer: Buffer, prompt: string): Promise<string> {
        const openai = new OpenAI({ apiKey });

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
}
