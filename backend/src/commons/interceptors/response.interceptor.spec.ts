import { describe, it, expect } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor.js';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  function createMockContext(statusCode = 200): ExecutionContext {
    return {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode }),
        getRequest: () => ({ url: '/api/v1/test' }),
      }),
    } as unknown as ExecutionContext;
  }

  function createCallHandler(data: any): CallHandler {
    return {
      handle: () => of(data),
    };
  }

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should wrap standard payload with message, success: true, data, and code', async () => {
    const ctx = createMockContext(200);
    const handler = createCallHandler({ id: 1, name: 'Test User' });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({
      message: 'Thành công',
      success: true,
      data: { id: 1, name: 'Test User' },
      code: 200,
    });
  });

  it('should extract custom message from data when data contains a message string', async () => {
    const ctx = createMockContext(200);
    const handler = createCallHandler({
      message: 'Đăng xuất thành công.',
      action: 'CLEAR_TOKEN',
    });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({
      message: 'Đăng xuất thành công.',
      success: true,
      data: {
        message: 'Đăng xuất thành công.',
        action: 'CLEAR_TOKEN',
      },
      code: 200,
    });
  });

  it('should handle null or undefined data gracefully (data: null)', async () => {
    const ctx = createMockContext(204);
    const handler = createCallHandler(undefined);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual({
      message: 'Thành công',
      success: true,
      data: null,
      code: 204,
    });
  });

  it('should preserve custom HTTP status code (e.g. 201 Created)', async () => {
    const ctx = createMockContext(201);
    const handler = createCallHandler({ id: 99, created: true });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result.code).toBe(201);
    expect(result.success).toBe(true);
    expect((result as any).statusCode).toBeUndefined();
  });

  it('should avoid double-wrapping when payload is already formatted as ApiResponse', async () => {
    const ctx = createMockContext(200);
    const preformatted = {
      message: 'Already formatted',
      success: true,
      data: { item: 1 },
      code: 200,
    };
    const handler = createCallHandler(preformatted);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toEqual(preformatted);
    // Ensure data is NOT nested as data.data
    expect((result.data as any).data).toBeUndefined();
  });
});
