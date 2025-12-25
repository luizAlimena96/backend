import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { TemplatesService } from './templates.service';

interface CreateTemplateDto {
    name: string;
    category: string;
    language?: string;
    headerType?: string;
    headerContent?: string;
    bodyText: string;
    footerText?: string;
    buttons?: any;
}

interface UpdateTemplateDto extends Partial<CreateTemplateDto> { }

@Controller('organizations/:orgId/templates')
export class TemplatesController {
    constructor(private readonly templatesService: TemplatesService) { }

    /**
     * List all templates for an organization
     */
    @Get()
    async listTemplates(@Param('orgId') orgId: string) {
        return this.templatesService.listTemplates(orgId);
    }

    /**
     * Get a single template
     */
    @Get(':templateId')
    async getTemplate(
        @Param('orgId') orgId: string,
        @Param('templateId') templateId: string,
    ) {
        return this.templatesService.getTemplate(orgId, templateId);
    }

    /**
     * Create a new template
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createTemplate(
        @Param('orgId') orgId: string,
        @Body() createDto: CreateTemplateDto,
    ) {
        return this.templatesService.createTemplate(orgId, createDto);
    }

    /**
     * Update a template
     */
    @Put(':templateId')
    async updateTemplate(
        @Param('orgId') orgId: string,
        @Param('templateId') templateId: string,
        @Body() updateDto: UpdateTemplateDto,
    ) {
        return this.templatesService.updateTemplate(orgId, templateId, updateDto);
    }

    /**
     * Delete a template
     */
    @Delete(':templateId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteTemplate(
        @Param('orgId') orgId: string,
        @Param('templateId') templateId: string,
    ) {
        return this.templatesService.deleteTemplate(orgId, templateId);
    }

    /**
     * Sync templates with Meta (fetch approved templates from Meta)
     */
    @Post('sync')
    async syncTemplates(@Param('orgId') orgId: string) {
        return this.templatesService.syncTemplatesWithMeta(orgId);
    }
}
