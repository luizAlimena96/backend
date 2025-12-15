"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickResponsesModule = void 0;
const common_1 = require("@nestjs/common");
const quick_responses_controller_1 = require("./quick-responses.controller");
const quick_responses_service_1 = require("./quick-responses.service");
let QuickResponsesModule = class QuickResponsesModule {
};
exports.QuickResponsesModule = QuickResponsesModule;
exports.QuickResponsesModule = QuickResponsesModule = __decorate([
    (0, common_1.Module)({
        controllers: [quick_responses_controller_1.QuickResponsesController],
        providers: [quick_responses_service_1.QuickResponsesService],
    })
], QuickResponsesModule);
//# sourceMappingURL=quick-responses.module.js.map