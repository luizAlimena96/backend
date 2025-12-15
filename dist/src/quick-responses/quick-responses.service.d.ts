import { PrismaService } from "../database/prisma.service";
export declare class QuickResponsesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<{
        name: string;
        id: string;
        type: import(".prisma/client").$Enums.QuickResponseType;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
    }[]>;
    create(data: any): Promise<{
        name: string;
        id: string;
        type: import(".prisma/client").$Enums.QuickResponseType;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
    }>;
    update(id: string, data: any): Promise<{
        name: string;
        id: string;
        type: import(".prisma/client").$Enums.QuickResponseType;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
