import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { RoleEntity } from '../../modules/role/role.entity.js';
import { UserEntity } from '../../modules/user/user.entity.js';

@Injectable()
export class UserSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserSeedService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';
    const isEnabled =
      this.configService.get<string>('SEED_SAMPLE_DATA', 'false') === 'true';

    if (!isDevelopment || !isEnabled) {
      return;
    }

    const username = this.configService
      .get<string>('SEED_ADMIN_USERNAME', 'admin_demo')
      .trim();
    const password = this.configService.get<string>(
      'SEED_ADMIN_PASSWORD',
      'Admin@123456',
    );
    const email = this.configService
      .get<string>('SEED_ADMIN_EMAIL', 'admin.demo@example.com')
      .trim()
      .toLowerCase();

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUser) {
      this.logger.log(`Sample admin '${username}' already exists; skipping.`);
      return;
    }

    if (password.length < 8) {
      throw new Error(
        'SEED_ADMIN_PASSWORD must contain at least 8 characters.',
      );
    }

    const emailOwner = await this.userRepository.findOne({ where: { email } });
    if (emailOwner) {
      throw new Error(`SEED_ADMIN_EMAIL '${email}' is already in use.`);
    }

    const adminRole = await this.roleRepository.findOne({
      where: { roleCode: 'ADMIN', isActive: true },
    });
    if (!adminRole) {
      throw new Error(
        'Active ADMIN role is required before seeding sample user.',
      );
    }

    const passwordHash = await argon2.hash(password);
    const user = this.userRepository.create({
      username,
      passwordHash,
      fullName: 'Quản trị viên mẫu',
      email,
      roleId: adminRole.id,
      enterpriseId: null,
      isActive: true,
      createdBy: null,
      updatedBy: null,
    });

    await this.userRepository.save(user);
    this.logger.log(`Created sample admin '${username}'.`);
  }
}
