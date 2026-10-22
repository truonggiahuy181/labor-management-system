import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes.js';

// Mã lỗi mặc định theo HTTP status khi exception không gắn `code` nghiệp vụ
const DEFAULT_ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.FILE_TOO_LARGE,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SERVICE_UNAVAILABLE,
};
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Lỗi máy chủ nội bộ';
    let errorData: any = null;
    let errorCode: string | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || exception.message;
        if ((res as any).errors) {
          errorData = (res as any).errors;
        }
        if (typeof (res as any).code === 'string') {
          errorCode = (res as any).code;
        }
      } else {
        message = exception.message;
      }
    } else {
      this.logger.error('Unhandled exception', exception);
    }

    const formattedMessage = Array.isArray(message)
      ? message.join(', ')
      : typeof message === 'string'
        ? message
        : JSON.stringify(message);

    response.status(statusCode).json({
      message: formattedMessage,
      success: false,
      data: errorData,
      code: errorCode ?? DEFAULT_ERROR_CODES[statusCode] ?? ErrorCode.INTERNAL_ERROR,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
