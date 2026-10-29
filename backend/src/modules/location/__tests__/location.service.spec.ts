import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationService } from '../location.service.js';

describe('LocationService', () => {
  let provinceRepository: {
    find: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };
  let wardRepository: {
    find: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
  };
  let service: LocationService;

  beforeEach(() => {
    provinceRepository = {
      find: vi.fn(),
      exists: vi.fn(),
    };
    wardRepository = { find: vi.fn(), exists: vi.fn() };
    service = new LocationService(
      provinceRepository as never,
      wardRepository as never,
    );
  });

  it('returns active provinces without persistence-only fields', async () => {
    provinceRepository.find.mockResolvedValue([
      {
        code: '79',
        name: 'Thành phố Hồ Chí Minh',
        divisionType: 'thành phố trung ương',
        isActive: true,
      },
    ]);

    await expect(service.getProvinces()).resolves.toEqual([
      {
        code: '79',
        name: 'Thành phố Hồ Chí Minh',
        divisionType: 'thành phố trung ương',
      },
    ]);
    expect(provinceRepository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  });

  it('returns active wards belonging to the selected province', async () => {
    provinceRepository.exists.mockResolvedValue(true);
    wardRepository.find.mockResolvedValue([
      {
        code: '26740',
        provinceCode: '79',
        name: 'Phường Tam Thắng',
        divisionType: 'phường',
        isActive: true,
      },
    ]);

    await expect(service.getWards('79')).resolves.toEqual([
      {
        code: '26740',
        provinceCode: '79',
        name: 'Phường Tam Thắng',
        divisionType: 'phường',
      },
    ]);
    expect(wardRepository.find).toHaveBeenCalledWith({
      where: { provinceCode: '79', isActive: true },
      order: { name: 'ASC' },
    });
  });

  it('rejects a province that does not exist or is inactive', async () => {
    provinceRepository.exists.mockResolvedValue(false);

    await expect(service.getWards('99')).rejects.toThrow(NotFoundException);
    expect(wardRepository.find).not.toHaveBeenCalled();
  });

  it('validates that a ward belongs to the selected province', async () => {
    provinceRepository.exists.mockResolvedValue(true);
    wardRepository.exists.mockResolvedValue(true);

    await expect(
      service.assertValidSelection('79', '26740'),
    ).resolves.toBeUndefined();
    expect(wardRepository.exists).toHaveBeenCalledWith({
      where: { code: '26740', provinceCode: '79', isActive: true },
    });
  });

  it('rejects a ward that does not belong to the selected province', async () => {
    provinceRepository.exists.mockResolvedValue(true);
    wardRepository.exists.mockResolvedValue(false);

    await expect(service.assertValidSelection('79', '00004')).rejects.toThrow(
      BadRequestException,
    );
  });
});
