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
exports.FSMEngineService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let FSMEngineService = class FSMEngineService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async decideNextState(input) {
        console.log('[FSM Engine] Processing decision for state:', input.currentState);
        const currentState = await this.prisma.state.findFirst({
            where: {
                agentId: input.agentId,
                name: input.currentState,
            },
        });
        if (!currentState) {
            return {
                nextState: 'INICIO',
                reasoning: ['Estado atual não encontrado', 'Retornando para INICIO'],
                extractedData: input.extractedData,
                validation: {
                    approved: true,
                    confidence: 0.5,
                    justificativa: 'Fallback para estado inicial',
                    alertas: [],
                },
                shouldExtractData: false,
            };
        }
        return {
            nextState: currentState.name,
            reasoning: ['Processamento simplificado', 'Mantendo estado atual'],
            extractedData: input.extractedData,
            validation: {
                approved: true,
                confidence: 0.8,
                justificativa: 'Estado mantido',
                alertas: [],
            },
            shouldExtractData: true,
        };
    }
};
exports.FSMEngineService = FSMEngineService;
exports.FSMEngineService = FSMEngineService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FSMEngineService);
//# sourceMappingURL=fsm-engine.service.js.map