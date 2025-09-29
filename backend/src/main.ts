import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { webcrypto as nodeWebcrypto } from 'crypto';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import type { AppConfig } from '@infrastructure/config/app.config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(globalThis as any).crypto) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto = nodeWebcrypto as any;
}

// Defer AppModule import until after crypto polyfill is set
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('./app.module');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Если приложение работает за прокси (NGINX), доверяем заголовкам X-Forwarded-*
  const trustProxyEnv = String(configService.get('TRUST_PROXY') ?? '').toLowerCase();
  if (trustProxyEnv === 'true' || trustProxyEnv === '1') {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: configService.get('RATE_LIMIT_TTL', 60000),
      limit: configService.get('RATE_LIMIT_LIMIT', 5000),
      message: 'Too many requests from this IP',
    }),
  );

  app.enableCors({
    origin: ['http://localhost:5173'],
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const nodeEnv = configService.get<string>('NODE_ENV');
  const enableSwagger = configService.get<string>('ENABLE_SWAGGER') === 'true' || nodeEnv !== 'production';
  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('The Last of Guss API')
      .setDescription('Browser game API where players tap a virtual goose')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }



  await app.listen(configService.get<number>('APP_PORT') ?? 3000);
  const port = configService.get<number>('APP_PORT') ?? 3000;
  const logger2 = new Logger('Bootstrap');
  logger2.log(`🚀 Application is running on: http://localhost:${port}`);
  if (enableSwagger) {
    logger2.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
