import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Round } from '@domain/round/round.entity';
import { RoundRepositoryPort } from '@domain/round/ports/round.repository.port';

@Injectable()
export class RoundRepositoryAdapter implements RoundRepositoryPort {
  constructor(
    @InjectRepository(Round)
    private readonly roundRepository: Repository<Round>,
  ) {}

  async findById(id: string): Promise<Round | null> {
    return await this.roundRepository.findOne({ where: { id } });
  }

  async findByIdWithParticipants(id: string): Promise<Round | null> {
    return await this.roundRepository.findOne({
      where: { id },
      relations: ['participants', 'participants.user'],
      order: {
        participants: {
          score: 'DESC',
        },
      },
    });
  }

  async findAll(): Promise<Round[]> {
    return await this.roundRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllWithStatus(): Promise<Round[]> {
    return await this.roundRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async save(round: Round): Promise<Round> {
    return await this.roundRepository.save(round);
  }

  create(roundData: Partial<Round>): Round {
    return this.roundRepository.create(roundData);
  }

  async incrementTotalScore(roundId: string, delta: number, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(Round) : this.roundRepository;
    await repo
      .createQueryBuilder()
      .update(Round)
      .set({ totalScore: () => '"totalScore" + (:delta)::bigint' })
      .where('id = :id', { id: roundId })
      .setParameters({ delta })
      .execute();
  }
}
