import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { config } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  app.enableCors({ origin: config.corsOrigin, credentials: true });
  app.useGlobalFilters(new AllExceptionsFilter());

  const openApiConfig = new DocumentBuilder()
    .setTitle('FeedbackHub API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, openApiConfig));

  await app.listen(config.port, '0.0.0.0');
}

void bootstrap();
