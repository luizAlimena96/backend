import { PrismaService } from "../database/prisma.service";
export declare class ConversationsService {
    private prisma;
    constructor(prisma: PrismaService);
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
        tags: {
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            color: string;
        }[];
        messages: {
            id: string;
            timestamp: Date;
            type: import(".prisma/client").$Enums.MessageType;
            conversationId: string;
            messageId: string;
            content: string;
            fromMe: boolean;
            thought: string | null;
        }[];
    } & {
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        aiEnabled: boolean;
        whatsapp: string;
    })[]>;
    findOne(id: string): Promise<({
        agent: {
            isActive: boolean;
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
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
            prohibitions: string | null;
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
        tags: {
            name: string;
            id: string;
            organizationId: string;
            createdAt: Date;
            updatedAt: Date;
            color: string;
        }[];
        messages: {
            id: string;
            timestamp: Date;
            type: import(".prisma/client").$Enums.MessageType;
            conversationId: string;
            messageId: string;
            content: string;
            fromMe: boolean;
            thought: string | null;
        }[];
    } & {
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        aiEnabled: boolean;
        whatsapp: string;
    }) | null>;
    create(data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        aiEnabled: boolean;
        whatsapp: string;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        aiEnabled: boolean;
        whatsapp: string;
    }>;
    toggleAI(id: string, enabled: boolean): Promise<{
        id: string;
        organizationId: string;
        agentId: string;
        leadId: string | null;
        createdAt: Date;
        updatedAt: Date;
        aiEnabled: boolean;
        whatsapp: string;
    }>;
    getMessages(conversationId: string): Promise<{
        id: string;
        timestamp: Date;
        type: import(".prisma/client").$Enums.MessageType;
        conversationId: string;
        messageId: string;
        content: string;
        fromMe: boolean;
        thought: string | null;
    }[]>;
    sendMessage(conversationId: string, content: string, fromMe?: boolean): Promise<{
        id: string;
        timestamp: Date;
        type: import(".prisma/client").$Enums.MessageType;
        conversationId: string;
        messageId: string;
        content: string;
        fromMe: boolean;
        thought: string | null;
    }>;
    addTag(conversationId: string, tagId: string): Promise<{
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
        aiEnabled: boolean;
        whatsapp: string;
    }>;
    removeTag(conversationId: string, tagId: string): Promise<{
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
        aiEnabled: boolean;
        whatsapp: string;
    }>;
}
