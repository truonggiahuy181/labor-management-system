import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: Number(this.configService.get('REDIS_PORT', 6379)),
      password: this.configService.get<string>('REDIS_PASSWORD') || undefined,
      db: Number(this.configService.get('REDIS_DB', 0)),
      lazyConnect: true,
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err: Error) => this.logger.error('Redis error', err));

    this.client.connect().catch((err: Error) => this.logger.error('Redis connect failed', err));
  }

  async onModuleDestroy() {
    if (this.client && this.client.status !== 'end') {
      await this.client.quit().catch(() => {});
    }
  }

  // ─── Blacklist access token (khi logout) ─────────────────────────────────────
  // key: `bl:at:<jti>` | value: '1' | ttl = thời gian còn lại của token
  async blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.client.set(`bl:at:${jti}`, '1', 'EX', ttlSeconds);
  }

  // Fail-Closed: Nếu Redis gặp sự cố, từ chối request để tránh lọt token bị thu hồi
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    try {
      const result = await this.client.exists(`bl:at:${jti}`);
      return result === 1;
    } catch (err) {
      this.logger.error(`Không thể kiểm tra Redis blacklist (jti: ${jti}):`, err);
      throw new ServiceUnavailableException(
        'Không thể xác minh phiên đăng nhập. Vui lòng thử lại sau.',
      );
    }
  }

  // ─── Refresh token (Dual-index: rt:<tokenHash> -> userId và user_rt:<userId> -> tokenHash)
  async saveRefreshToken(
    userId: number,
    tokenHash: string,
    ttlSeconds: number,
    oldTokenHash?: string,
  ): Promise<void> {
    const multi = this.client.multi();
    // Thu hồi ngay lập tức token cũ khỏi danh sách active token để KHÔNG THỂ tái sử dụng để tạo token mới
    if (oldTokenHash) {
      multi.del(`rt:${oldTokenHash}`);
    } else {
      const oldHash = await this.client.get(`user_rt:${userId}`);
      if (oldHash && oldHash !== tokenHash) {
        multi.del(`rt:${oldHash}`);
      }
    }
    multi.set(`rt:${tokenHash}`, userId.toString(), 'EX', ttlSeconds);
    multi.set(`user_rt:${userId}`, tokenHash, 'EX', ttlSeconds);
    await multi.exec();
  }

  // Lưu kết quả xoay vòng của token cũ trong grace period (15s) để các tab đồng thời nhận cùng 1 kết quả
  async saveRotatedTokenResult(
    oldTokenHash: string,
    resultJson: string,
    graceSeconds = 15,
  ): Promise<void> {
    await this.client.set(`rt_rotated:${oldTokenHash}`, resultJson, 'EX', graceSeconds);
  }

  // Lấy kết quả xoay vòng đã cache của token cũ
  async getRotatedTokenResult(tokenHash: string): Promise<string | null> {
    return await this.client.get(`rt_rotated:${tokenHash}`);
  }

  // Khóa phân tán nguyên tử ngắn hạn (5s) có gắn Owner ID duy nhất để chống race condition
  async acquireRotationLock(
    tokenHash: string,
    ownerId: string,
    ttlSeconds = 5,
  ): Promise<boolean> {
    const res = await this.client.set(
      `rt_lock:${tokenHash}`,
      ownerId,
      'EX',
      ttlSeconds,
      'NX',
    );
    return res === 'OK';
  }

  // Giải phóng khóa nguyên tử bằng Lua script (CHỈ xóa khi giá trị trong Redis khớp đúng ownerId)
  async releaseRotationLock(tokenHash: string, ownerId: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    try {
      const res = await this.client.eval(luaScript, 1, `rt_lock:${tokenHash}`, ownerId);
      return res === 1;
    } catch {
      return false;
    }
  }

  async getRefreshTokenTtl(userId: number): Promise<number> {
    try {
      const ttl = await this.client.ttl(`user_rt:${userId}`);
      return ttl > 0 ? ttl : 24 * 60 * 60;
    } catch {
      return 24 * 60 * 60;
    }
  }

  async getUserIdByRefreshToken(tokenHash: string): Promise<number | null> {
    const userIdStr = await this.client.get(`rt:${tokenHash}`);
    return userIdStr ? parseInt(userIdStr, 10) : null;
  }

  async deleteRefreshToken(userId: number): Promise<void> {
    const tokenHash = await this.client.get(`user_rt:${userId}`);
    const multi = this.client.multi();
    if (tokenHash) {
      multi.del(`rt:${tokenHash}`);
    }
    multi.del(`user_rt:${userId}`);
    await multi.exec();
  }
}
