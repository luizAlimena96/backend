import { TagsService } from "./tags.service";
export declare class TagsController {
    private tagsService;
    constructor(tagsService: TagsService);
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
