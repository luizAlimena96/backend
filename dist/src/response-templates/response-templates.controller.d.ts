import { ResponseTemplatesService } from "./response-templates.service";
export declare class ResponseTemplatesController {
    private responseTemplatesService;
    constructor(responseTemplatesService: ResponseTemplatesService);
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
