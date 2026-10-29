import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { JwtAuthGuard } from './commons/guards/jwt-auth.guard.js';
import { CsrfGuard } from './commons/guards/csrf.guard.js';
import { RolesGuard } from './commons/guards/roles.guard.js';
import { ResponseInterceptor } from './commons/interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './commons/filters/global-exception.filter.js';
import { EnterpriseModule } from './modules/enterprise/enterprise.module.js';
import { SeedModule } from './database/seeds/seed.module.js';
import { createDatabaseOptions } from './database/database-options.js';
import { FileModule } from './modules/file/file.module.js';
import { LocationModule } from './modules/location/location.module.js';

@Module({
  imports: [
    // Cấu hình env toàn cục
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/.env'],
    }),

    // Kết nối Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createDatabaseOptions(
          (key, defaultValue) => configService.get<string>(key) ?? defaultValue,
        ),
    }),

    AuthModule,
    UserModule,
    EnterpriseModule,
    FileModule,
    LocationModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard CSRF bảo vệ các request mutating khi dùng cookie auth
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    // Guard JWT áp dụng toàn cục – dùng @Public() để bỏ qua
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Guard phân quyền chạy sau JWT để sử dụng roleCode đã được xác thực từ DB
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    // Interceptor chuẩn hóa response
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Filter bắt lỗi toàn cục
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
