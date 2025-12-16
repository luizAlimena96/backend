import { PrismaService } from "../database/prisma.service";
export declare class QuickResponsesService {
    private prisma;
    constructor(prisma: PrismaService);
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
