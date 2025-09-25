import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@domain/user/user.entity';
import { UserRepositoryPort } from '@domain/user/ports/user.repository.port';

@Injectable()
export class UserRepositoryAdapter implements UserRepositoryPort {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { username } });
  }

  async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }

  create(userData: Partial<User>): User {
    const now = new Date();
    const userWithTimestamps = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };
    return this.userRepository.create(userWithTimestamps);
  }
}
