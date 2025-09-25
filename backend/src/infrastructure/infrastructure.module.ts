import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Round, RoundParticipant]),
  ],
  providers: [
    // Repository adapters
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
    {
      provide: 'TapServicePort',
      useClass: TapDomainService,
    },
    RoundDomainService,
  ],
  exports: [
    'UserRepositoryPort',
    'RoundRepositoryPort',
    'RoundParticipantRepositoryPort',
    'TapServicePort',
    RoundDomainService,
  ],
})
export class InfrastructureModule {}
