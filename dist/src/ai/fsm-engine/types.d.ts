export interface DecisionInput {
    agentId: string;
    currentState: string;
    lastMessage: string;
    extractedData: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    leadId?: string;
    organizationId: string;
    customPrompts?: CustomPrompts;
}
export interface CustomPrompts {
    dataExtractor?: string | null;
    stateDecider?: string | null;
    validator?: string | null;
}
export interface Route {
    estado: string;
    descricao: string;
}
export interface AvailableRoutes {
    rota_de_sucesso: Route[];
    rota_de_persistencia: Route[];
    rota_de_escape: Route[];
}
export interface StateInfo {
    id: string;
    name: string;
    missionPrompt: string;
    availableRoutes: AvailableRoutes;
    dataKey: string | null;
    dataDescription: string | null;
    dataType: string | null;
    prohibitions: string | null;
    tools: string | null;
}
export interface AgentContext {
    name: string;
    personality: string | null;
    tone: string;
    systemPrompt: string | null;
    instructions: string | null;
    writingStyle: string | null;
    prohibitions: string | null;
    workingHours: any | null;
}
export interface ExtractionInput {
    message: string;
    dataKey: string | null;
    dataType: string | null;
    dataDescription: string | null;
    currentExtractedData: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    agentContext: AgentContext;
}
export interface ExtractionResult {
    success: boolean;
    data: Record<string, any>;
    confidence: number;
    metadata: {
        extractedAt: Date;
        dataKey: string | null;
        dataType: string | null;
        extractedFields: string[];
    };
    reasoning: string[];
}
export interface DataKeyDefinition {
    key: string;
    description: string;
    type: string;
}
export interface GlobalExtractionInput {
    message: string;
    allDataKeys: DataKeyDefinition[];
    currentExtractedData: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    agentContext: AgentContext;
}
export interface GlobalExtractionResult {
    success: boolean;
    extractedData: Record<string, any>;
    confidence: Record<string, number>;
    metadata: {
        extractedAt: Date;
        totalDataKeys: number;
        extractedCount: number;
        extractedFields: string[];
    };
    reasoning: string[];
}
export interface DecisionInputForAI {
    currentState: string;
    missionPrompt: string;
    dataKey: string | null;
    extractedData: Record<string, any>;
    lastMessage: string;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    availableRoutes: AvailableRoutes;
    prohibitions: string | null;
    agentContext: AgentContext;
    knowledgeContext?: string;
}
export type Veredito = 'SUCESSO' | 'FALHA' | 'PENDENTE' | 'ERRO';
export type TipoRota = 'rota_de_sucesso' | 'rota_de_persistencia' | 'rota_de_escape';
export interface DecisionResult {
    pensamento: string[];
    estado_escolhido: string;
    veredito: Veredito;
    rota_escolhida: TipoRota;
    confianca: number;
}
export interface ValidationInput {
    currentState: string;
    proposedNextState: string;
    decision: DecisionResult;
    extractedData: Record<string, any>;
    conversationHistory: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>;
    stateInfo: StateInfo;
    agentContext: AgentContext;
}
export interface ValidationResult {
    approved: boolean;
    confidence: number;
    justificativa: string;
    alertas: string[];
    retryable: boolean;
    suggestedState?: string;
}
export interface DecisionOutput {
    nextState: string;
    reasoning: string[];
    extractedData: Record<string, any>;
    validation: ValidationResult;
    shouldExtractData: boolean;
    dataToExtract?: string;
    knowledgeContext?: string;
    metrics: {
        extractionTime: number;
        decisionTime: number;
        validationTime: number;
        totalTime: number;
    };
}
export interface FSMError {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
}
export declare class FSMEngineError extends Error {
    code: string;
    details?: any;
    recoverable: boolean;
    constructor(code: string, message: string, details?: any, recoverable?: boolean);
}
