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
exports.ElevenLabsService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = __importDefault(require("axios"));
let ElevenLabsService = class ElevenLabsService {
    baseUrl = 'https://api.elevenlabs.io/v1';
    async textToSpeech(apiKey, text, voiceId = '21m00Tcm4TlvDq8ikWAM') {
        try {
            const cleanApiKey = apiKey.trim();
            console.log('[ElevenLabs] Generating TTS...', {
                textLength: text.length,
                voiceId,
                apiKeyLength: cleanApiKey.length
            });
            const response = await axios_1.default.post(`${this.baseUrl}/text-to-speech/${voiceId}`, {
                text,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                },
            }, {
                headers: {
                    'xi-api-key': cleanApiKey,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            });
            console.log('[ElevenLabs] TTS generated successfully, size:', response.data.length);
            return Buffer.from(response.data);
        }
        catch (error) {
            console.error('[ElevenLabs] TTS Error:', error?.response?.data || error.message);
            throw new Error('Failed to generate audio from text');
        }
    }
};
exports.ElevenLabsService = ElevenLabsService;
exports.ElevenLabsService = ElevenLabsService = __decorate([
    (0, common_1.Injectable)()
], ElevenLabsService);
//# sourceMappingURL=elevenlabs.service.js.map