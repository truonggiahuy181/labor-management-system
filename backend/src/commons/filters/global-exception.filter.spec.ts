import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ArgumentsHost,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
  HttpStatus,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter.js';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/v1/test-endpoint',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format HttpException with message, success: false, data: null, code, timestamp, path', () => {
    const exception = new UnauthorizedException('Tài khoản hoặc mật khẩu không đúng.');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Tài khoản hoặc mật khẩu không đúng.',
        success: false,
        data: null,
        code: 401,
        path: '/api/v1/test-endpoint',
        timestamp: expect.any(String),
      }),
    );
    const sentData = mockResponse.json.mock.calls[0][0];
    expect(sentData.statusCode).toBeUndefined();
  });

  it('should format validation errors array by joining into a single message string', () => {
    const validationErrors = [
      'Email không đúng định dạng',
      'Mật khẩu phải có ít nhất 6 ký tự',
    ];
    const exception = new BadRequestException({
      statusCode: 400,
      message: validationErrors,
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Email không đúng định dạng, Mật khẩu phải có ít nhất 6 ký tự',
        success: false,
        data: null,
        code: 400,
        path: '/api/v1/test-endpoint',
      }),
    );
  });

  it('should format unhandled non-HttpExceptions with 500 Internal Server Error', () => {
    const unknownError = new Error('Database connection crashed');

    filter.catch(unknownError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Lỗi máy chủ nội bộ',
        success: false,
        data: null,
        code: 500,
        path: '/api/v1/test-endpoint',
      }),
    );
  });
});
