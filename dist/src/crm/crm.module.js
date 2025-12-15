"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CRMModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const crm_controller_1 = require("./crm.controller");
const crm_service_1 = require("./crm.service");
const crm_proxy_controller_1 = require("./crm-proxy.controller");
const crm_templates_controller_1 = require("./crm-templates.controller");
const crm_configs_module_1 = require("../crm-configs/crm-configs.module");
const crm_templates_module_1 = require("../crm-templates/crm-templates.module");
const crm_automations_module_1 = require("../crm-automations/crm-automations.module");
let CRMModule = class CRMModule {
};
exports.CRMModule = CRMModule;
exports.CRMModule = CRMModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            crm_configs_module_1.CrmConfigsModule,
            crm_templates_module_1.CrmTemplatesModule,
            crm_automations_module_1.CrmAutomationsModule,
        ],
        controllers: [crm_controller_1.CRMController, crm_proxy_controller_1.CRMProxyController, crm_templates_controller_1.CRMTemplatesController],
        providers: [crm_service_1.CRMService],
        exports: [crm_service_1.CRMService],
    })
], CRMModule);
//# sourceMappingURL=crm.module.js.map