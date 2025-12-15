"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmConfigsModule = void 0;
const common_1 = require("@nestjs/common");
const crm_configs_controller_1 = require("./crm-configs.controller");
const crm_configs_service_1 = require("./crm-configs.service");
const prisma_service_1 = require("../database/prisma.service");
let CrmConfigsModule = class CrmConfigsModule {
};
exports.CrmConfigsModule = CrmConfigsModule;
exports.CrmConfigsModule = CrmConfigsModule = __decorate([
    (0, common_1.Module)({
        controllers: [crm_configs_controller_1.CrmConfigsController],
        providers: [crm_configs_service_1.CrmConfigsService, prisma_service_1.PrismaService],
        exports: [crm_configs_service_1.CrmConfigsService],
    })
], CrmConfigsModule);
//# sourceMappingURL=crm-configs.module.js.map