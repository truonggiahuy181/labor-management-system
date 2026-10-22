import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UserEntity } from './user.entity.js';
import { BaseService } from '../../commons/bases/base.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserMapper } from './user.mapper.js';

@Injectable()
export class UserService extends BaseService<UserEntity> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    super(userRepository);
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByResetToken(token: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });
  }

  async createUser(dto: CreateUserDto, creatorId?: number): Promise<UserEntity> {
    // 1. Kiểm tra username đã tồn tại chưa
    const existingUsername = await this.findByUsername(dto.username);
    if (existingUsername) {
      throw new ConflictException('Tên đăng nhập đã tồn tại trong hệ thống.');
    }

    // 2. Kiểm tra email đã tồn tại chưa
    if (dto.email) {
      const existingEmail = await this.findByEmail(dto.email);
      if (existingEmail) {
        throw new ConflictException('Email đã tồn tại trong hệ thống.');
      }
    }

    // 3. Băm mật khẩu bằng Argon2
    const passwordHash = await argon2.hash(dto.password);

    // 4. Map DTO sang Entity và lưu
    const newUser = this.userRepository.create(
      UserMapper.toEntity(dto, passwordHash, creatorId),
    );

    return this.userRepository.save(newUser);
  }
}

