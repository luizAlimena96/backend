import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security headers com Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // CORS melhorado com validação de origem
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        configService.get<string>('FRONTEND_URL'),
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600,
  });

  // Body parser com limite reduzido (1MB padrão)
  app.use(require('body-parser').json({ limit: '1mb' }));
  app.use(require('body-parser').urlencoded({ limit: '1mb', extended: true }));

  // Global timeout interceptor
  app.useGlobalInterceptors(new TimeoutInterceptor());

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Set global prefix
  app.setGlobalPrefix('api');

  const port = configService.get<number>('PORT', 3002);
  await app.listen(port);

  console.log(`✅ Backend is running on: http://localhost:${port}/api`);
  console.log(`🏥 Health check available at: http://localhost:${port}/api/health`);

  // Sinaliza ao PM2 que o app está pronto
  if (process.send) {
    process.send('ready');
    console.log('📡 PM2 ready signal sent');
  }

  // Graceful shutdown handlers
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    try {
      await app.close();
      console.log('✅ Application closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap();
