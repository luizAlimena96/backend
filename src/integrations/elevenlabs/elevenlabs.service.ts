import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ElevenLabsService {
    constructor(private httpService: HttpService) { }

    async textToSpeech(text: string, voiceId: string, apiKey: string): Promise<Buffer> {
        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                    {
                        text,
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                        },
                    },
                    {
                        headers: {
                            'xi-api-key': apiKey,
                            'Content-Type': 'application/json',
                        },
                        responseType: 'arraybuffer',
                    }
                )
            );

            return Buffer.from(response.data);
        } catch (error) {
            console.error('ElevenLabs TTS error:', error);
            throw new Error('Failed to generate speech');
        }
    }
}
