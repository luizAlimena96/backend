"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageProcessingService = void 0;
const common_1 = require("@nestjs/common");
let MessageProcessingService = class MessageProcessingService {
    async processIncomingMessage(message) {
        console.log('[Message Processing] Processing:', message);
        const { from, content, type } = message;
        if (type === 'text') {
            return this.processTextMessage(from, content);
        }
        else if (type === 'audio') {
            return this.processAudioMessage(from, content);
        }
        return { processed: true };
    }
    async processTextMessage(from, content) {
        console.log(`Processing text from ${from}: ${content}`);
        return { type: 'text', processed: true };
    }
    async processAudioMessage(from, content) {
        console.log(`Processing audio from ${from}`);
        return { type: 'audio', processed: true };
    }
};
exports.MessageProcessingService = MessageProcessingService;
exports.MessageProcessingService = MessageProcessingService = __decorate([
    (0, common_1.Injectable)()
], MessageProcessingService);
//# sourceMappingURL=message-processing.service.js.map