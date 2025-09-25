import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { AppModule } from './app.module';
import { AppConfig } from '@infrastructure/config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app')!;
  const logger = new Logger('Bootstrap');

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

  if (appConfig.nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('The Last of Guss API')
      .setDescription('Browser game API where players tap a virtual goose')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(appConfig.port);
  logger.log(`🚀 Application is running on: http://localhost:${appConfig.port}`);
  logger.log(`📚 Swagger docs: http://localhost:${appConfig.port}/api/docs`);
}

bootstrap();
