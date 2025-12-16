import { PrismaService } from "../database/prisma.service";
export declare class ResponseTemplatesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string, category?: string): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        content: string;
        category: string;
        variables: string[];
        isDefault: boolean;
    }[]>;
    create(data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        content: string;
        category: string;
        variables: string[];
        isDefault: boolean;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        content: string;
        category: string;
        variables: string[];
        isDefault: boolean;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
