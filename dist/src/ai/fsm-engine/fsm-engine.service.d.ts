import { PrismaService } from '../../database/prisma.service';
import { OpenAIService } from '../services/openai.service';
import { KnowledgeSearchService } from '../services/knowledge-search.service';
import { DataExtractorService } from './services/data-extractor.service';
import { StateDeciderService } from './services/state-decider.service';
import { DecisionValidatorService } from './services/decision-validator.service';
import { DecisionInput, DecisionOutput } from './types';
export declare class FSMEngineService {
    private prisma;
    private openaiService;
    private knowledgeSearch;
    private dataExtractor;
    private stateDecider;
    private decisionValidator;
    constructor(prisma: PrismaService, openaiService: OpenAIService, knowledgeSearch: KnowledgeSearchService, dataExtractor: DataExtractorService, stateDecider: StateDeciderService, decisionValidator: DecisionValidatorService);
    decideNextState(input: DecisionInput): Promise<DecisionOutput>;
    private processState;
}
