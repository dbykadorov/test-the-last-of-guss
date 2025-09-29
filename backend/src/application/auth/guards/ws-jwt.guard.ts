import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService, private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = this.extractToken(client);
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      client.data = client.data || {};
      client.data.user = { id: payload.sub, username: payload.username, role: payload.role };
      // Присоединяем персональную комнату пользователя для unicast событий
      if (typeof client.join === 'function') {
        client.join(`user:${payload.sub}`);
      }
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractToken(client: any): string | null {
    const tokenFromQuery = client.handshake?.query?.token as string | undefined;
    if (tokenFromQuery) return tokenFromQuery;
    const auth = client.handshake?.headers?.authorization as string | undefined;
    if (auth?.startsWith('Bearer ')) return auth.slice('Bearer '.length);
    return null;
  }
}


