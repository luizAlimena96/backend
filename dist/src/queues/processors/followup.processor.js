"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowupProcessor = void 0;
const common_1 = require("@nestjs/common");
let FollowupProcessor = class FollowupProcessor {
    async process(job) {
        console.log('[Followup Processor] Processing job:', job.id);
        const { followupId, leadId, message } = job.data;
        console.log(`Sending followup ${followupId} to lead ${leadId}: ${message}`);
    }
};
exports.FollowupProcessor = FollowupProcessor;
exports.FollowupProcessor = FollowupProcessor = __decorate([
    (0, common_1.Injectable)()
], FollowupProcessor);
//# sourceMappingURL=followup.processor.js.map