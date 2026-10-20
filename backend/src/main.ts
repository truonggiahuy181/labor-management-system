import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kích hoạt middleware phân tích cookie
  app.use(cookieParser());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? 3000);

  // Cấu hình CORS: hỗ trợ credentials cho Cookie và chỉ định rõ origins
  const configuredOrigins = (process.env.FRONTEND_URL ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([
      ...configuredOrigins,
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ]),
  );

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Cho phép requests không có Origin (ví dụ Swagger, curl, server-to-server)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, '').toLowerCase();
      if (allowedOrigins.some((allowed) => allowed.toLowerCase() === cleanOrigin)) {
        return callback(null, true);
      }
      // Từ chối origin không hợp lệ một cách êm đẹp (trình duyệt tự chặn CORS)
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
  });

  // Validation pipe toàn cục
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Loại bỏ trường không khai báo trong DTO
      forbidNonWhitelisted: true,
      transform: true,       // Tự động transform kiểu dữ liệu
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger UI
  const config = new DocumentBuilder()
    .setTitle('Hệ thống Quản lý Lao động – API Documentation')

    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Dán trực tiếp mã accessToken vào đây (không cần gõ chữ "Bearer")',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Giữ nguyên token khi F5 trình duyệt
    },
  });

  await app.listen(port);

  console.log(`🚀 Server đang chạy tại: http://localhost:${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
}

await bootstrap();