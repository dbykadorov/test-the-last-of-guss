import { User } from '../user.entity';

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  save(user: User): Promise<User>;
  create(userData: Partial<User>): User;
}

export const UserRepositoryPort = Symbol('UserRepositoryPort');
