import { Injectable, ConflictException, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, OptimisticLockVersionMismatchError, DataSource, EntityManager } from 'typeorm';
import { RoundParticipant } from '@domain/round/round-participant.entity';
import { RoundParticipantRepositoryPort } from '@domain/round/ports/round-participant.repository.port';

@Injectable({ scope: Scope.REQUEST })
export class RoundParticipantRepositoryAdapter implements RoundParticipantRepositoryPort {
  constructor(
    @InjectRepository(RoundParticipant)
    private readonly participantRepository: Repository<RoundParticipant>,
    private readonly dataSource: DataSource,
  ) {}

  async findById(id: string): Promise<RoundParticipant | null> {
    return await this.participantRepository.findOne({ where: { id } });
  }

  async findByUserAndRound(userId: string, roundId: string): Promise<RoundParticipant | null> {
    return await this.participantRepository.findOne({
      where: { userId, roundId },
      relations: ['user'],
    });
  }

  async findByUserAndRoundForUpdate(userId: string, roundId: string): Promise<RoundParticipant | null> {
    return await this.participantRepository
      .createQueryBuilder('p')
      .setLock('pessimistic_write')
      .where('p.userId = :userId AND p.roundId = :roundId', { userId, roundId })
      .getOne();
  }

  async findByRound(roundId: string): Promise<RoundParticipant[]> {
    return await this.participantRepository.find({
      where: { roundId },
      relations: ['user'],
      order: { score: 'DESC' },
    });
  }

  async findTopByRound(roundId: string, limit = 10): Promise<RoundParticipant[]> {
    return await this.participantRepository.find({
      where: { roundId },
      relations: ['user'],
      order: { score: 'DESC' },
      take: limit,
    });
  }

  async save(participant: RoundParticipant): Promise<RoundParticipant> {
    return await this.participantRepository.save(participant);
  }

  async saveWithOptimisticLock(participant: RoundParticipant): Promise<RoundParticipant> {
    try {
      return await this.participantRepository.save(participant);
    } catch (error) {
      if (error instanceof OptimisticLockVersionMismatchError) {
        throw new ConflictException('Concurrent modification detected. Please try again.');
      }
      throw error;
    }
  }

  async executeInTransaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T> {
    return await this.dataSource.transaction(async (manager) => {
      // подменяем репозиторий, чтобы завернуть в транзакцию
      const originalRepo = this.participantRepository;
      Object.defineProperty(this, 'participantRepository', {
        value: manager.getRepository(RoundParticipant),
        writable: true,
      });

      try {
        const result = await operation(manager);
        return result;
      } finally {
        // восстанавливаем обратно
        Object.defineProperty(this, 'participantRepository', {
          value: originalRepo,
          writable: true,
        });
      }
    });
  }

  create(participantData: Partial<RoundParticipant>): RoundParticipant {
    const now = new Date();
    const participantWithTimestamps = {
      ...participantData,
      createdAt: now,
      updatedAt: now,
    };
    return this.participantRepository.create(participantWithTimestamps);
  }
}
