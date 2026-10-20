import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

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
      code: statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
