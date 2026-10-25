import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndustryService } from '../industry.service.js';

describe('IndustryService', () => {
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };
  let service: IndustryService;

  beforeEach(() => {
    repository = { find: vi.fn(), findOne: vi.fn() };
    service = new IndustryService(repository as any);
  });

  it('returns level-four industries ordered by code', async () => {
    repository.find.mockResolvedValue([
      {
        id: 1,
        industryCode: '6201',
        industryName: 'Lập trình máy vi tính',
        level: 4,
        parentId: null,
      },
    ]);

    await expect(service.getAllLevelFour()).resolves.toEqual([
      {
        id: 1,
        industryCode: '6201',
        industryName: 'Lập trình máy vi tính',
        level: 4,
        parentId: null,
      },
    ]);
    expect(repository.find).toHaveBeenCalledWith({
      where: { level: 4 },
      order: { industryCode: 'ASC' },
    });
  });

  it('returns a level-four industry', async () => {
    repository.findOne.mockResolvedValue({ id: 1, level: 4 });

    await expect(service.getLevelFourByIdOrFail(1)).resolves.toMatchObject({
      id: 1,
    });
  });

  it('rejects an industry outside level four', async () => {
    repository.findOne.mockResolvedValue({ id: 2, level: 2 });

    await expect(service.getLevelFourByIdOrFail(2)).rejects.toThrow(
      BadRequestException,
    );
  });
});
