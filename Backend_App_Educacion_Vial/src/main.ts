import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { join } from 'path';
import * as express from 'express';
import fs from 'fs-extra';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  await fs.ensureDir(join(process.cwd(), 'uploads', 'temp'));
  await fs.ensureDir(join(process.cwd(), 'uploads', 'pieces'));
  // ✅ Agregar middleware de JSON parsing
  app.use(require('body-parser').json({ limit: '10mb' }));
  app.use(require('body-parser').urlencoded({ extended: true, limit: '10mb' }));
  // Servir imágenes estáticas del proyecto
  app.use('/assets/images', express.static(join(process.cwd(), 'assets', 'images')));
  app.use('/uploads/pieces', express.static(join(process.cwd(), 'uploads', 'pieces')));
  app.use('/uploads/pieces', express.static(join(process.cwd(), 'uploads', 'pieces')));
  app.use('/uploads/temp', express.static(join(process.cwd(), 'uploads', 'temp')));
  // Middleware para procesar solicitudes
  app.use((req, res, next) => {
    next();
  });

  // Configuración de CORS

  // Configuración de CORS


  app.enableCors({
    origin: [
      'http://localhost:19006', // Expo web
      'http://localhost:3000',
      /^http:\/\/localhost:\d+$/,// Si lo mueves a React
    ],
    credentials: true,
  });

  // Configuración de WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API de Quiz Vial')
    .setDescription('API para el juego de educación vial')
    .setVersion('1.0')
    .addTag('quiz')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Validación global
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(3002, 'localhost');
}
bootstrap();
