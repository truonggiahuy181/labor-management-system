import {
  Repository,
  FindManyOptions,
  FindOneOptions,
  DeepPartial,
} from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BaseEntity } from './base.entity.js';

export abstract class BaseService<T extends BaseEntity> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findOneOrFail(options: FindOneOptions<T>): Promise<T> {
    const entity = await this.repository.findOne(options);
    if (!entity) {
      throw new NotFoundException('Không tìm thấy bản ghi');
    }
    return entity;
  }

  async save(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: number, data: DeepPartial<T>): Promise<T> {
    await this.repository.update(id, data as any);
    return this.findOneOrFail({ where: { id } as any });
  }

  async softDelete(id: number): Promise<void> {
    await this.repository.softDelete(id);
  }

  async paginate(
    page: number,
    pageSize: number,
    options?: FindManyOptions<T>,
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
    const [data, total] = await this.repository.findAndCount({
      ...options,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total, page, pageSize };
  }
}
