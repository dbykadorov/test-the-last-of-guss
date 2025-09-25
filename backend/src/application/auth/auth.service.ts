import { Injectable, UnauthorizedException, ConflictException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@domain/user/user.entity';
import { UserRepositoryPort } from '@domain/user/ports/user.repository.port';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    // ищем юзера
    let user = await this.userRepository.findByUsername(username);

    if (!user) {
      // TODO: только для демки! при первом логине пользователя создаем, в жизни так не делаем, честно-честно =^_^=
      user = await this.createUser(username, password);
    } else {
      // Если нашли юзера, проверим пароль
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    const token = this.generateJwtToken(user);

    return {
      user: this.mapToUserResponse(user),
      token,
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }

  private async createUser(username: string, password: string): Promise<User> {
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const role = User.determineRole(username);

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      role,
    });

    return await this.userRepository.save(user);
  }

  private generateJwtToken(user: User): string {
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  private mapToUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
