import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface FSMDecisionInput {
    agentId: string;
    currentState: string;
    lastMessage: string;
    extractedData: any;
    conversationHistory: Array<{ role: string; content: string }>;
    leadId?: string;
    organizationId: string;
}

export interface FSMDecisionOutput {
    nextState: string;
    reasoning: string[];
    extractedData: any;
    validation: {
        approved: boolean;
        confidence: number;
        justificativa: string;
        alertas: string[];
    };
    shouldExtractData: boolean;
    metrics?: any;
}

@Injectable()
export class FSMEngineService {
    constructor(private prisma: PrismaService) { }

    async decideNextState(input: FSMDecisionInput): Promise<FSMDecisionOutput> {
        console.log('[FSM Engine] Processing decision for state:', input.currentState);

        // Simplified FSM logic - full implementation would use 3-AI system
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

        // Return current state for now (placeholder)
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
}
