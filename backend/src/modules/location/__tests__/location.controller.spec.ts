import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationController } from '../location.controller.js';
import type { LocationService } from '../location.service.js';

describe('LocationController', () => {
  let service: {
    getProvinces: ReturnType<typeof vi.fn>;
    getWards: ReturnType<typeof vi.fn>;
  };
  let controller: LocationController;

  beforeEach(() => {
    service = {
      getProvinces: vi.fn(),
      getWards: vi.fn(),
    };
    controller = new LocationController(service as unknown as LocationService);
  });

  it('gets provinces from the service', async () => {
    service.getProvinces.mockResolvedValue([{ code: '79' }]);

    await expect(controller.getProvinces()).resolves.toEqual([{ code: '79' }]);
  });

  it('passes the province code when getting wards', async () => {
    service.getWards.mockResolvedValue([{ code: '26740' }]);

    await controller.getWards({ provinceCode: '79' });

    expect(service.getWards).toHaveBeenCalledWith('79');
  });
});
