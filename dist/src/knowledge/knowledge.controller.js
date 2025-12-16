"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const knowledge_service_1 = require("./knowledge.service");
const document_service_1 = require("./document.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
let KnowledgeController = class KnowledgeController {
    knowledgeService;
    documentService;
    constructor(knowledgeService, documentService) {
        this.knowledgeService = knowledgeService;
        this.documentService = documentService;
    }
    async findAll(organizationId, agentId) {
        return this.knowledgeService.findAll(organizationId, agentId);
    }
    async create(data) {
        return this.knowledgeService.create(data);
    }
    async upload(file, title, agentId, organizationId) {
        console.log('[Upload] Received request');
        console.log('[Upload] File:', file ? { name: file.originalname, size: file.size, mimetype: file.mimetype } : 'NO FILE');
        console.log('[Upload] Title:', title);
        console.log('[Upload] AgentId:', agentId);
        console.log('[Upload] OrganizationId:', organizationId);
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        if (!title || !agentId || !organizationId) {
            throw new common_1.BadRequestException('Missing required fields: title, agentId, organizationId');
        }
        console.log('[Upload] Extracting text from file...');
        const { text, metadata } = await this.documentService.extractText(file.buffer, file.mimetype, file.originalname);
        if (!text || text.trim().length === 0) {
            throw new common_1.BadRequestException('Could not extract text from file');
        }
        console.log('[Upload] Creating knowledge with extracted text...');
        const startTime = Date.now();
        const knowledge = await this.knowledgeService.create({
            title,
            agentId,
            organizationId,
            content: text,
            type: 'DOCUMENT',
            fileName: file.originalname,
            fileSize: file.size,
        });
        console.log('[Upload] Knowledge created:', knowledge.id);
        console.log('[Upload] Waiting for RAG processing to complete...');
        console.log('[Upload] This may take 1-2 minutes for large PDFs...');
        try {
            await this.knowledgeService.waitForProcessing(knowledge.id);
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`[Upload] RAG processing completed successfully in ${duration}s`);
            return { success: true, knowledge };
        }
        catch (error) {
            console.error('[Upload] RAG processing failed:', error);
            throw new common_1.BadRequestException('Failed to process document: ' + error.message);
        }
    }
    async update(id, data) {
        return this.knowledgeService.update(id, data);
    }
    async delete(id) {
        return this.knowledgeService.delete(id);
    }
};
exports.KnowledgeController = KnowledgeController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("organizationId")),
    __param(1, (0, common_1.Query)("agentId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('title')),
    __param(2, (0, common_1.Body)('agentId')),
    __param(3, (0, common_1.Body)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "upload", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Query)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Query)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], KnowledgeController.prototype, "delete", null);
exports.KnowledgeController = KnowledgeController = __decorate([
    (0, common_1.Controller)("knowledge"),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [knowledge_service_1.KnowledgeService,
        document_service_1.DocumentService])
], KnowledgeController);
//# sourceMappingURL=knowledge.controller.js.map