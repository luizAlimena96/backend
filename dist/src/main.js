"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.enableCors({
        origin: configService.get('FRONTEND_URL', 'http://localhost:3001'),
        credentials: true,
    });
    app.use(require('body-parser').json({ limit: '10mb' }));
    app.use(require('body-parser').urlencoded({ limit: '10mb', extended: true }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    const port = configService.get('PORT', 3002);
    await app.listen(port);
    console.log(` Backend is running on: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map