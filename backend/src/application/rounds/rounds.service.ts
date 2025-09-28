import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoundDomainService } from '@domain/round/round.domain-service';
import { TapDomainService } from '@domain/tap/tap.domain-service';
import { RoundRepositoryPort } from '@domain/round/ports/round.repository.port';
import { RoundParticipantRepositoryPort } from '@domain/round/ports/round-participant.repository.port';
import { User } from '@domain/user/user.entity';
import { UserRole } from '@domain/user/user-role.enum';
import { RoundDto, RoundDetailsDto, RoundParticipantDto } from './dto/round-response.dto';
import { TapResponseDto } from './dto/tap-response.dto';
import { AppConfig } from '@infrastructure/config/app.config';

@Injectable()
export class RoundsService {
  constructor(
    private readonly roundDomainService: RoundDomainService,
    private readonly tapService: TapDomainService,
    @Inject('RoundRepositoryPort')
    private readonly roundRepository: RoundRepositoryPort,
    @Inject('RoundParticipantRepositoryPort')
    private readonly participantRepository: RoundParticipantRepositoryPort,
    private readonly configService: ConfigService,
  ) {}

  async createRound(user: User): Promise<RoundDto> {
    if (!user.canCreateRounds()) {
      throw new ForbiddenException('Only admins can create rounds');
    }

    const appConfig = this.configService.get<AppConfig>('app')!;
    const round = await this.roundDomainService.createRound(
      appConfig.cooldownDuration,
      appConfig.roundDuration,
    );

    return this.mapToRoundDto(round);
  }

  async getAllRounds(): Promise<RoundDto[]> {
    const rounds = await this.roundDomainService.findAllRounds();
    return rounds.map(round => this.mapToRoundDto(round));
  }

  async getRoundDetails(roundId: string, userId: string): Promise<RoundDetailsDto> {
    const round = await this.roundDomainService.findRoundWithDetails(roundId);
    const myParticipation = round.participants.find(p => p.userId === userId);
    const winner = round.isFinished() 
      ? await this.roundDomainService.getRoundWinner(roundId)
      : undefined;

    return {
      ...this.mapToRoundDto(round),
      participants: round.participants.map(p => this.mapToParticipantDto(p)),
      myParticipation: myParticipation ? this.mapToParticipantDto(myParticipation) : undefined,
      winner: winner ? this.mapToParticipantDto(winner) : undefined,
    };
  }

  async executeTap(roundId: string, user: User): Promise<TapResponseDto> {
    const tapResult = await this.tapService.executeTap(user.id, roundId);

    return {
      myScore: tapResult.myScore,
      tapsCount: tapResult.tapsCount,
      bonusEarned: tapResult.bonusEarned,
      scoreEarned: tapResult.scoreEarned,
    };
  }

  private mapToRoundDto(round: any): RoundDto {
    return {
      id: round.id,
      startTime: round.startTime.toISOString(),
      endTime: round.endTime.toISOString(),
      status: round.status,
      totalScore: Number(round.totalScore),
      createdAt: round.createdAt.toISOString(),
    };
  }

  private mapToParticipantDto(participant: any): RoundParticipantDto {
    return {
      id: participant.id,
      score: Number(participant.score),
      tapsCount: participant.tapsCount,
      user: {
        id: participant.user.id,
        username: participant.user.username,
        role: participant.user.role,
      },
    };
  }
}
