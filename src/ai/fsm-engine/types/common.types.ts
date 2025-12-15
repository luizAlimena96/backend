// Common types for FSM Engine
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

export interface Route {
    estado: string;
    descricao: string;
}

export interface AvailableRoutes {
    rota_de_sucesso: Route[];
    rota_de_persistencia: Route[];
    rota_de_escape: Route[];
}
