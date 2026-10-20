import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T = any> {
  message: string;
  success: boolean;
  data: T;
  code: number;
}

// Alias ResponseData để tương thích ngược với code cũ
export type ResponseData<T = any> = ApiResponse<T>;

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const res = context.switchToHttp().getResponse();
    const statusCode = res?.statusCode ?? 200;

    return next.handle().pipe(
      map((data) => {
        // 1. Tránh bọc response nhiều lần nếu dữ liệu đã có format ApiResponse
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'code' in data
        ) {
          return {
            message: (data as any).message ?? 'Thành công',
            success: (data as any).success,
            data: (data as any).data !== undefined ? (data as any).data : null,
            code: (data as any).code ?? statusCode,
          };
        }

        // 2. Trích xuất message từ controller trả về nếu có
        let message = 'Thành công';
        if (
          data &&
          typeof data === 'object' &&
          typeof (data as any).message === 'string' &&
          (data as any).message.trim() !== ''
        ) {
          message = (data as any).message;
        }

        return {
          message,
          success: true,
          data: data !== undefined ? data : null,
          code: statusCode,
        };
      }),
    );
  }
}
