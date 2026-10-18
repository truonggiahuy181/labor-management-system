import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { UserModule } from './modules/user/user.module.js';
import { UserEntity } from './modules/user/user.entity.js';
import { JwtAuthGuard } from './commons/guards/jwt-auth.guard.js';
import { ResponseInterceptor } from './commons/interceptors/response.interceptor.js';
import { GlobalExceptionFilter } from './commons/filters/global-exception.filter.js';

@Module({
  imports: [
    // Cấu hình env toàn cục
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Kết nối Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get('DB_PORT', 5432)),
        username: configService.get<string>('DB_USERNAME', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'quan_ly_lao_dong'),
        entities: [UserEntity],
        synchronize: configService.get<string>('DB_SYNC') === 'true',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),

    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Guard JWT áp dụng toàn cục – dùng @Public() để bỏ qua
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
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
