import { Logger, UseGuards } from '@nestjs/common';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '@application/auth/guards/ws-jwt.guard';
import { TapDomainService } from '@domain/tap/tap.domain-service';

@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: ['http://localhost:5173'],
    credentials: false,
  },
})
@UseGuards(WsJwtGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  public server!: Server;

  constructor(private readonly moduleRef: ModuleRef) {}

  // Аутентификация подключений выполняется через WsJwtGuard (см. guards/ws-jwt.guard)

  handleConnection(client: Socket) {
    Logger.debug(`WS connected: ${client.id}`, GameGateway.name);
  }

  handleDisconnect(client: Socket) {
    Logger.debug(`WS disconnected: ${client.id}`, GameGateway.name);
  }

  @SubscribeMessage('round:join')
  async onRoundJoin(client: Socket, roundId: string) {
    const room = this.getRoundRoom(roundId);
    await client.join(room);
    Logger.debug(`Client ${client.id} joined ${room}`, GameGateway.name);
    return { ok: true };
  }

  @SubscribeMessage('round:leave')
  async onRoundLeave(client: Socket, roundId: string) {
    const room = this.getRoundRoom(roundId);
    await client.leave(room);
    Logger.debug(`Client ${client.id} left ${room}`, GameGateway.name);
    return { ok: true };
  }

  @SubscribeMessage('tap')
  async onTap(
    client: Socket,
    payload: { roundId: string },
    ack?: (response: { ok: boolean; error?: string }) => void,
  ) {
    // Простейшая защита от спама — продвинутые лимиты можно вынести в guard/interceptor
    const userId: string | undefined = client?.data?.user?.id;
    if (!userId) {
      if (ack) ack({ ok: false, error: 'unauthorized' });
      return;
    }
    Logger.debug(
      `tap request socket=${client.id} userId=${userId} roundId=${payload?.roundId}`,
      GameGateway.name,
    );
    // Разрешаем сервис per-request, чтобы поддержать request-scoped зависимости
    let tapService: TapDomainService | undefined = undefined;
    try {
      const contextId = ContextIdFactory.create();
      // Привязываем сокет как контекст запроса для request-scoped графа зависимостей
      this.moduleRef.registerRequestByContextId(client, contextId);
      tapService = await this.moduleRef.resolve<TapDomainService>(TapDomainService, contextId, { strict: false });
    } catch (e) {
      Logger.warn(`Failed to resolve TapDomainService via ModuleRef: ${String(e)}`, GameGateway.name);
    }
    if (!tapService) {
      Logger.error('TapDomainService could not be resolved', GameGateway.name);
      if (ack) ack({ ok: false, error: 'server_misconfigured' });
      return;
    }
    try {
      const result = await tapService.executeTap(userId, payload.roundId);
      // Отправляем события здесь, избегая циклических зависимостей
      try {
        this.emitRoundUpdate(payload.roundId, { roundId: payload.roundId, scoreEarned: result.scoreEarned });
        this.emitToUser(userId, 'tap:result', {
          roundId: payload.roundId,
          myScore: result.myScore,
          tapsCount: result.tapsCount,
          bonusEarned: result.bonusEarned,
          scoreEarned: result.scoreEarned,
        });
      } catch (e) {
        Logger.warn(`WS emit failed: ${String(e)}`, GameGateway.name);
      }
      if (ack) ack({ ok: true });
    } catch (e: any) {
      const message = e?.message ?? 'tap_failed';
      if (ack) ack({ ok: false, error: message });
      Logger.warn(`tap failed for user ${userId} on round ${payload.roundId}: ${message}` , GameGateway.name);
    }
  }

  // Server → clients: broadcast обновления раунда в его комнату
  public emitRoundUpdate(roundId: string, payload: unknown): void {
    const room = this.getRoundRoom(roundId);
    this.server.to(room).emit('round:update', payload);
  }

  // Server → user: персональный unicast по user room
  public emitToUser(userId: string, event: string, payload: unknown): void {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  private getRoundRoom(roundId: string): string {
    return `round:${roundId}`;
  }
}


