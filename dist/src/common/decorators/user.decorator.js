"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentOrganization = exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
exports.CurrentOrganization = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.organizationId;
});
//# sourceMappingURL=user.decorator.js.map