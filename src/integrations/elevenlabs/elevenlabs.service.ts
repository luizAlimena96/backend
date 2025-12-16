import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ElevenLabsService {
    private readonly baseUrl = 'https://api.elevenlabs.io/v1';

    async textToSpeech(
        apiKey: string,
        text: string,
        voiceId: string = '21m00Tcm4TlvDq8ikWAM' // Default voice (Rachel)
    ): Promise<Buffer> {
        try {
            // Trim API key to remove any whitespace/newlines that might cause header issues
            const cleanApiKey = apiKey.trim();

            console.log('[ElevenLabs] Generating TTS...', {
                textLength: text.length,
                voiceId,
                apiKeyLength: cleanApiKey.length
            });

            const response = await axios.post(
                `${this.baseUrl}/text-to-speech/${voiceId}`,
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
                        'xi-api-key': cleanApiKey,
                        'Content-Type': 'application/json',
                    },
                    responseType: 'arraybuffer',
                }
            );

            console.log('[ElevenLabs] TTS generated successfully, size:', response.data.length);
            return Buffer.from(response.data);
        } catch (error) {
            console.error('[ElevenLabs] TTS Error:', error?.response?.data || error.message);
            throw new Error('Failed to generate audio from text');
        }
    }
}
