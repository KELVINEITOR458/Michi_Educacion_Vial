import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Agregar middleware de JSON parsing
  app.use(require('body-parser').json({ limit: '10mb' }));
  app.use(require('body-parser').urlencoded({ extended: true, limit: '10mb' }));

  // Middleware para procesar solicitudes
  app.use((req, res, next) => {
    next();
  });

  // Configuración de CORS

  // Configuración de CORS
  const allowedOrigins = [
    'http://localhost:19006',
    'http://192.168.68.110:19006',
    'http://192.168.68.110:9999',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:3004',
    'http://localhost:8000',
    'http://localhost:8081',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:9999',
    'https://ovvtv10-anonymous-8081.exp.direct',
    'http://localhost:*', // Permitir cualquier puerto localhost
    'exp://192.168.68.110:19000',
    'exp://192.168.68.114:19000',
    'http://192.168.68.114:19006',
    'http://192.168.68.114:*', // Asegúrate de que esta sea la URL de tu Expo Go
    /^https?:\/\/192\.168\.68\.\d{1,3}:\d+$/, // Permite cualquier puerto en tu red local
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origen (como aplicaciones móviles o solicitudes de Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      })) {
        return callback(null, true);
      }

      const msg = 'El CORS policy no permite el acceso desde este origen.';
      return callback(new Error(msg), false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
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

  await app.listen(3002);
}
bootstrap();
