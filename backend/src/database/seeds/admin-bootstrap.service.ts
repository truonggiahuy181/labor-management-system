import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { bootstrapAdmin } from './admin-bootstrap.js';

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled =
      this.configService.get<string>('BOOTSTRAP_ADMIN_ENABLED', 'false') ===
      'true';
    if (!enabled) return;

    const result = await this.dataSource.transaction((manager) =>
      bootstrapAdmin(manager, {
        username: this.configService.get<string>('BOOTSTRAP_ADMIN_USERNAME', ''),
        password: this.configService.get<string>('BOOTSTRAP_ADMIN_PASSWORD', ''),
        email: this.configService.get<string>('BOOTSTRAP_ADMIN_EMAIL', ''),
        fullName: this.configService.get<string>('BOOTSTRAP_ADMIN_FULL_NAME', ''),
      }),
    );

    this.logger.log(
      result.created
        ? `Created bootstrap admin '${result.username}'. Disable BOOTSTRAP_ADMIN_ENABLED now.`
        : `Bootstrap admin '${result.username}' already exists; skipping.`,
    );
  }
}
