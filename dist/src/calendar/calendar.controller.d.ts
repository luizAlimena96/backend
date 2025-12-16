import { CalendarService } from './calendar.service';
export declare class CalendarController {
    private calendarService;
    constructor(calendarService: CalendarService);
    getGoogleEvents(agentId: string): Promise<{
        id: any;
        summary: any;
        description: any;
        location: any;
        startTime: any;
        endTime: any;
    }[]>;
    getBlockedSlots(organizationId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: Date;
        title: string | null;
        endTime: Date;
        allDay: boolean;
    }[]>;
    createBlockedSlot(data: {
        organizationId: string;
        startTime: string;
        endTime: string;
        title?: string;
        allDay?: boolean;
    }): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: Date;
        title: string | null;
        endTime: Date;
        allDay: boolean;
    }>;
    deleteBlockedSlot(id: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        startTime: Date;
        title: string | null;
        endTime: Date;
        allDay: boolean;
    }>;
    getWorkingHours(organizationId: string): Promise<string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray | {
        MON: {
            enabled: boolean;
            shifts: {
                start: string;
                end: string;
            }[];
        };
        TUE: {
            enabled: boolean;
            shifts: {
                start: string;
                end: string;
            }[];
        };
        WED: {
            enabled: boolean;
            shifts: {
                start: string;
                end: string;
            }[];
        };
        THU: {
            enabled: boolean;
            shifts: {
                start: string;
                end: string;
            }[];
        };
        FRI: {
            enabled: boolean;
            shifts: {
                start: string;
                end: string;
            }[];
        };
        SAT: {
            enabled: boolean;
            shifts: never[];
        };
        SUN: {
            enabled: boolean;
            shifts: never[];
        };
    }>;
    updateWorkingHours(data: {
        organizationId: string;
        workingHours: any;
    }): Promise<{
        number: string | null;
        state: string | null;
        id: string;
        phone: string | null;
        createdAt: Date;
        name: string;
        isActive: boolean;
        updatedAt: Date;
        email: string | null;
        googleAccessToken: string | null;
        googleCalendarEnabled: boolean;
        googleCalendarId: string | null;
        googleRefreshToken: string | null;
        googleTokenExpiry: Date | null;
        workingHours: import("@prisma/client/runtime/library").JsonValue | null;
        slug: string;
        settings: import("@prisma/client/runtime/library").JsonValue | null;
        evolutionApiUrl: string | null;
        evolutionApiKey: string | null;
        evolutionInstanceName: string | null;
        whatsappConnected: boolean;
        whatsappQrCode: string | null;
        whatsappPhone: string | null;
        whatsappConnectedAt: Date | null;
        crmEnabled: boolean;
        crmType: string | null;
        crmWebhookUrl: string | null;
        crmApiKey: string | null;
        crmAuthType: string | null;
        crmFieldMapping: import("@prisma/client/runtime/library").JsonValue | null;
        crmCalendarSyncEnabled: boolean;
        crmCalendarApiUrl: string | null;
        crmCalendarApiKey: string | null;
        crmCalendarSyncInterval: number;
        crmCalendarType: string | null;
        appointmentWebhookUrl: string | null;
        appointmentWebhookEnabled: boolean;
        zapSignApiToken: string | null;
        zapSignTemplateId: string | null;
        zapSignEnabled: boolean;
        openaiApiKey: string | null;
        openaiModel: string | null;
        elevenLabsApiKey: string | null;
        elevenLabsVoiceId: string | null;
        elevenLabsModel: string | null;
        city: string | null;
        document: string | null;
        neighborhood: string | null;
        niche: string | null;
        street: string | null;
        zipCode: string | null;
        openaiProjectId: string | null;
        whatsappAlertPhone1: string | null;
        whatsappAlertPhone2: string | null;
        whatsappLastConnected: Date | null;
        whatsappLastDisconnected: Date | null;
        whatsappMonitoringEnabled: boolean;
    }>;
}
