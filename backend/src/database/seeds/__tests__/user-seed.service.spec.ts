import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserSeedService } from '../user-seed.service.js';

vi.mock('argon2', () => ({
  hash: vi.fn().mockResolvedValue('hashed-sample-password'),
}));

describe('UserSeedService', () => {
  let userRepository: Record<string, ReturnType<typeof vi.fn>>;
  let roleRepository: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    userRepository = {
      findOne: vi.fn(),
      create: vi.fn((values) => values),
      save: vi.fn(async (entity) => ({ id: 10, ...entity })),
    };
    roleRepository = {
      findOne: vi.fn().mockResolvedValue({ id: 1, roleCode: 'ADMIN' }),
    };
  });

  const createService = (overrides: Record<string, string> = {}) => {
    const values: Record<string, string> = {
      NODE_ENV: 'development',
      SEED_SAMPLE_DATA: 'true',
      SEED_ADMIN_USERNAME: 'admin_demo',
      SEED_ADMIN_PASSWORD: 'Admin@123456',
      SEED_ADMIN_EMAIL: 'admin.demo@example.com',
      ...overrides,
    };
    const configService = {
      get: vi.fn((key: string, defaultValue?: string) =>
        values[key] === undefined ? defaultValue : values[key],
      ),
    };

    return new UserSeedService(
      userRepository as any,
      roleRepository as any,
      configService as any,
    );
  };

  it('does not seed when the feature is disabled', async () => {
    const service = createService({ SEED_SAMPLE_DATA: 'false' });

    await service.onApplicationBootstrap();

    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('never seeds in production', async () => {
    const service = createService({ NODE_ENV: 'production' });

    await service.onApplicationBootstrap();

    expect(userRepository.findOne).not.toHaveBeenCalled();
  });

  it('skips an existing sample user', async () => {
    userRepository.findOne.mockResolvedValue({ id: 10 });
    const service = createService();

    await service.onApplicationBootstrap();

    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('creates an active ADMIN sample user when missing', async () => {
    userRepository.findOne.mockResolvedValue(null);
    const service = createService();

    await service.onApplicationBootstrap();

    expect(roleRepository.findOne).toHaveBeenCalledWith({
      where: { roleCode: 'ADMIN', isActive: true },
    });
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'admin_demo',
        passwordHash: 'hashed-sample-password',
        email: 'admin.demo@example.com',
        roleId: 1,
        enterpriseId: null,
        isActive: true,
      }),
    );
    expect(userRepository.save).toHaveBeenCalledOnce();
  });
});
