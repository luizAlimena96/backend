import { PrismaService } from "../database/prisma.service";
export declare class TagsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(organizationId: string): Promise<{
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
    }[]>;
    create(data: any): Promise<{
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
    }>;
    update(id: string, data: any): Promise<{
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        color: string;
    }>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
}
