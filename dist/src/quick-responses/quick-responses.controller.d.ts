import { QuickResponsesService } from "./quick-responses.service";
export declare class QuickResponsesController {
    private quickResponsesService;
    constructor(quickResponsesService: QuickResponsesService);
    findAll(organizationId: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.QuickResponseType;
        content: string;
    }[]>;
    create(data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.QuickResponseType;
        content: string;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.QuickResponseType;
        content: string;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
