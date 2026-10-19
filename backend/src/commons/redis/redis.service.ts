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
  async saveRefreshToken(userId: number, tokenHash: string, ttlSeconds: number): Promise<void> {
    // Xóa token cũ của user nếu có để tránh tồn đọng
    const oldHash = await this.client.get(`user_rt:${userId}`);
    const multi = this.client.multi();
    if (oldHash) {
      multi.del(`rt:${oldHash}`);
    }
    multi.set(`rt:${tokenHash}`, userId.toString(), 'EX', ttlSeconds);
    multi.set(`user_rt:${userId}`, tokenHash, 'EX', ttlSeconds);
    await multi.exec();
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
