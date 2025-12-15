import { ResponseTemplatesService } from "./response-templates.service";
export declare class ResponseTemplatesController {
    private responseTemplatesService;
    constructor(responseTemplatesService: ResponseTemplatesService);
    findAll(organizationId: string, category?: string): Promise<{
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        category: string;
        variables: string[];
        isDefault: boolean;
    }[]>;
    create(data: any): Promise<{
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        content: string;
        category: string;
        variables: string[];
        isDefault: boolean;
    }>;
    update(id: string, data: any): Promise<{
        name: string;
        id: string;
        organizationId: string;
        createdAt: Date;
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
