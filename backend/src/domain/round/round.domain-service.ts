import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Round } from './round.entity';
import { RoundRepositoryPort } from './ports/round.repository.port';
import { RoundParticipantRepositoryPort } from './ports/round-participant.repository.port';

@Injectable()
export class RoundDomainService {
  constructor(
    @Inject('RoundRepositoryPort')
    private readonly roundRepository: RoundRepositoryPort,
    @Inject('RoundParticipantRepositoryPort')
    private readonly participantRepository: RoundParticipantRepositoryPort,
  ) {}

  async createRound(cooldownSeconds: number, durationSeconds: number): Promise<Round> {
    const round = Round.create(cooldownSeconds, durationSeconds);
    return await this.roundRepository.save(round);
  }

  async findRoundWithDetails(roundId: string): Promise<Round> {
    const round = await this.roundRepository.findByIdWithParticipants(roundId);
    if (!round) {
      throw new BadRequestException('Round not found');
    }

    // посчитаем мгновенный статус после того как подняли раунд из базы
    round.updateStatus();

    return round;
  }

  async findAllRounds(): Promise<Round[]> {
    const rounds = await this.roundRepository.findAllWithStatus();

    // тут тоже посчитаем статусы
    for (const round of rounds) {
      round.updateStatus();
    }
    return rounds;
  }

  async getRoundWinner(roundId: string): Promise<any> {
    if (!await this.isRoundFinished(roundId)) {
      return null;
    }

    const topParticipants = await this.participantRepository.findTopByRound(roundId, 1);
    return topParticipants.length > 0 ? topParticipants[0] : null;
  }

  private async isRoundFinished(roundId: string): Promise<boolean> {
    const round = await this.roundRepository.findById(roundId);
    return round ? round.isFinished() : false;
  }
}
