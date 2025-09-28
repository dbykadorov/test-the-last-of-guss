import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ModuleRef } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from '@application/auth/guards/ws-jwt.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/user/user.entity';
import { Round } from '@domain/round/round.entity';
import { RoundParticipant } from '@domain/round/round-participant.entity';
import { UserRepositoryAdapter } from './adapters/user.repository.adapter';
import { RoundRepositoryAdapter } from './adapters/round.repository.adapter';
import { RoundParticipantRepositoryAdapter } from './adapters/round-participant.repository.adapter';
import { UserRepositoryPort } from '@domain/user/ports/user.repository.port';
import { RoundRepositoryPort } from '@domain/round/ports/round.repository.port';
import { RoundParticipantRepositoryPort } from '@domain/round/ports/round-participant.repository.port';
import { TapServicePort } from '@domain/tap/ports/tap.service.port';
import { TapDomainService } from '@domain/tap/tap.domain-service';
import { RoundDomainService } from '@domain/round/round.domain-service';
import { TransactionalRunner } from './transaction/transactional-runner';
import { GameGateway } from '@interfaces/ws/game.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Round, RoundParticipant]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '24h') },
      }),
    }),
  ],
  providers: [
    {
      provide: 'UserRepositoryPort',
      useClass: UserRepositoryAdapter,
    },
    {
      provide: 'RoundRepositoryPort',
      useClass: RoundRepositoryAdapter,
    },
    {
      provide: 'RoundParticipantRepositoryPort',
      useClass: RoundParticipantRepositoryAdapter,
    },
    TapDomainService,
    {
      provide: 'TapServicePort',
      useExisting: TapDomainService,
    },
    RoundDomainService,
    TransactionalRunner,
    GameGateway,
    WsJwtGuard,
  ],
  exports: [
    'UserRepositoryPort',
    'RoundRepositoryPort',
    'RoundParticipantRepositoryPort',
    TapDomainService,
    'TapServicePort',
    RoundDomainService,
    TransactionalRunner,
    GameGateway,
  ],
})
export class InfrastructureModule {}
