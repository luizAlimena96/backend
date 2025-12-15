"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestAIModule = void 0;
const common_1 = require("@nestjs/common");
const test_ai_controller_1 = require("./test-ai.controller");
const test_ai_service_1 = require("./test-ai.service");
let TestAIModule = class TestAIModule {
};
exports.TestAIModule = TestAIModule;
exports.TestAIModule = TestAIModule = __decorate([
    (0, common_1.Module)({
        controllers: [test_ai_controller_1.TestAIController],
        providers: [test_ai_service_1.TestAIService],
        exports: [test_ai_service_1.TestAIService],
    })
], TestAIModule);
//# sourceMappingURL=test-ai.module.js.map