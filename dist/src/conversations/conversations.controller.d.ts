import { ConversationsService } from "./conversations.service";
export declare class ConversationsController {
    private conversationsService;
    constructor(conversationsService: ConversationsService);
    findAll(organizationId: string): Promise<({
        agent: {
            name: string;
            id: string;
        };
        lead: {
            name: string | null;
            id: string;
            phone: string;
        } | null;
        messages: {
            id: string;
            timestamp: Date;
            type: import(".prisma/client").$Enums.MessageType;
            conversationId: string;
            content: string;
            messageId: string;
            fromMe: boolean;
            thought: string | null;
        }[];
        tags: {
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            color: string;
        }[];
    } & {
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        whatsapp: string;
        aiEnabled: boolean;
    })[]>;
    findOne(id: string): Promise<({
        agent: {
            isActive: boolean;
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            prohibitions: string | null;
            googleAccessToken: string | null;
            googleCalendarEnabled: boolean;
            googleCalendarId: string | null;
            googleRefreshToken: string | null;
            googleTokenExpiry: Date | null;
            workingHours: import("@prisma/client/runtime/library").JsonValue | null;
            description: string | null;
            tone: import(".prisma/client").$Enums.Tone;
            language: string;
            instance: string;
            userId: string;
            allowDynamicDuration: boolean;
            blockedDates: import("@prisma/client/runtime/library").JsonValue | null;
            bufferTime: number;
            customTimeWindows: import("@prisma/client/runtime/library").JsonValue | null;
            followupDelay: number;
            followupEnabled: boolean;
            instructions: string | null;
            maxMeetingDuration: number;
            meetingDuration: number;
            minAdvanceHours: number;
            minMeetingDuration: number;
            notificationEnabled: boolean;
            notificationTemplate: string | null;
            personality: string | null;
            reminderEnabled: boolean;
            reminderHours: number;
            reminderMessage: string | null;
            systemPrompt: string | null;
            useCustomTimeWindows: boolean;
            dataCollectionInstructions: string | null;
            followupDecisionPrompt: string | null;
            followupHours: import("@prisma/client/runtime/library").JsonValue | null;
            initialStateId: string | null;
            messageBufferDelayMs: number;
            messageBufferEnabled: boolean;
            messageBufferMaxSize: number;
            notificationPhones: string[];
            responseDelay: number;
            writingStyle: string | null;
            dataExtractionPrompt: string | null;
            fsmDataExtractorPrompt: string | null;
            fsmStateDeciderPrompt: string | null;
            fsmValidatorPrompt: string | null;
            audioResponseEnabled: boolean;
            zapSignFieldMapping: import("@prisma/client/runtime/library").JsonValue | null;
            zapSignTriggerCrmStageId: string | null;
        };
        lead: {
            log: string | null;
            name: string | null;
            id: string;
            phone: string;
            currentState: string | null;
            organizationId: string;
            agentId: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            status: import(".prisma/client").$Enums.LeadStatus;
            source: string | null;
            cpf: string | null;
            email: string | null;
            phoneWith9: string | null;
            phoneNo9: string | null;
            address: string | null;
            contractDate: Date | null;
            extractedData: import("@prisma/client/runtime/library").JsonValue | null;
            maritalStatus: string | null;
            profession: string | null;
            zapSignDocumentId: string | null;
            zapSignSignedAt: Date | null;
            zapSignStatus: string | null;
            birthDate: Date | null;
            rg: string | null;
        } | null;
        messages: {
            id: string;
            timestamp: Date;
            type: import(".prisma/client").$Enums.MessageType;
            conversationId: string;
            content: string;
            messageId: string;
            fromMe: boolean;
            thought: string | null;
        }[];
        tags: {
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            color: string;
        }[];
    } & {
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        whatsapp: string;
        aiEnabled: boolean;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        whatsapp: string;
        aiEnabled: boolean;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        whatsapp: string;
        aiEnabled: boolean;
    }>;
    toggleAI(id: string, enabled: boolean): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        whatsapp: string;
        aiEnabled: boolean;
    }>;
    getMessages(id: string): Promise<{
        id: string;
        timestamp: Date;
        type: import(".prisma/client").$Enums.MessageType;
        conversationId: string;
        content: string;
        messageId: string;
        fromMe: boolean;
        thought: string | null;
    }[]>;
    sendMessage(id: string, content: string, role: string): Promise<{
        id: string;
        timestamp: Date;
        type: import(".prisma/client").$Enums.MessageType;
        conversationId: string;
        content: string;
        messageId: string;
        fromMe: boolean;
        thought: string | null;
    }>;
    addTag(id: string, tagId: string): Promise<{
        tags: {
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            color: string;
        }[];
    } & {
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        whatsapp: string;
        aiEnabled: boolean;
    }>;
    removeTag(id: string, tagId: string): Promise<{
        tags: {
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            color: string;
        }[];
    } & {
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        whatsapp: string;
        aiEnabled: boolean;
    }>;
}
