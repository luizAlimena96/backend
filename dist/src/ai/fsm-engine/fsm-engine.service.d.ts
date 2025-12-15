import { PrismaService } from '../../database/prisma.service';
export interface FSMDecisionInput {
    agentId: string;
    currentState: string;
    lastMessage: string;
    extractedData: any;
    conversationHistory: Array<{
        role: string;
        content: string;
    }>;
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
export declare class FSMEngineService {
    private prisma;
    constructor(prisma: PrismaService);
    decideNextState(input: FSMDecisionInput): Promise<FSMDecisionOutput>;
}
