import { PrismaService } from '../../database/prisma.service';
import { OpenAIService } from '../services/openai.service';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { DataExtractorService } from './services/data-extractor.service';
import { StateDeciderService } from './services/state-decider.service';
import { DecisionValidatorService } from './services/decision-validator.service';
export interface FSMDecisionInput {
    agentId: string;
    currentState: string;
    lastMessage: string;
    extractedData: any;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
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
    private openaiService;
    private knowledgeSearch;
    private dataExtractor;
    private stateDecider;
    private decisionValidator;
    constructor(prisma: PrismaService, openaiService: OpenAIService, knowledgeSearch: KnowledgeSearchService, dataExtractor: DataExtractorService, stateDecider: StateDeciderService, decisionValidator: DecisionValidatorService);
    decideNextState(input: FSMDecisionInput): Promise<FSMDecisionOutput>;
}
