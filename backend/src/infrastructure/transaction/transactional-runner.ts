import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Round } from '@domain/round/round.entity';
import { RoundParticipant } from '@domain/round/round-participant.entity';
import { RoundRepositoryPort } from '@domain/round/ports/round.repository.port';
import { RoundParticipantRepositoryPort } from '@domain/round/ports/round-participant.repository.port';

/**
 * Транзакционный раннер: даёт ровно то, что нужно для юзкейса «тап» —
 * participantRepository (блокировки/сохранение) и roundRepository (атомарный инкремент totalScore)
 * в рамках одного менеджера/транзакции.
 *
 * Как расширить при необходимости: добавьте соответствующую сущность и порт,
 * получите репозиторий через manager.getRepository(...), соберите адаптер с нужными методами
 * и верните его в объекте ниже (TransactionalRepositories).
 */
export interface TransactionalRepositories {
  roundRepository: RoundRepositoryPort;
  participantRepository: RoundParticipantRepositoryPort;
}

@Injectable()
export class TransactionalRunner {
  constructor(private readonly dataSource: DataSource) {}

  async runInTransaction<T>(
    operation: (repos: TransactionalRepositories, manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return await this.dataSource.transaction(async (manager) => {
      const roundRepo = manager.getRepository(Round);
      const participantRepo = manager.getRepository(RoundParticipant);

      const roundRepository: RoundRepositoryPort = {
        async findById(id: string) {
          return await roundRepo.findOne({ where: { id } });
        },
        async findByIdWithParticipants(id: string) {
          return await roundRepo.findOne({
            where: { id },
            relations: ['participants', 'participants.user'],
            order: { participants: { score: 'DESC' } },
          });
        },
        async findAll() {
          return await roundRepo.find({ order: { createdAt: 'DESC' } });
        },
        async findAllWithStatus() {
          return await roundRepo.find({ order: { createdAt: 'DESC' } });
        },
        async save(round: Round) {
          return await roundRepo.save(round);
        },
        create(data: Partial<Round>) {
          return roundRepo.create(data);
        },
        async incrementTotalScore(roundId: string, delta: number): Promise<void> {
          await roundRepo
            .createQueryBuilder()
            .update(Round)
            .set({ totalScore: () => '"totalScore" + (:delta)::bigint' })
            .where('id = :id', { id: roundId })
            .setParameters({ delta })
            .execute();
        },
      };

      const participantRepository: RoundParticipantRepositoryPort = {
        async findById(id: string) {
          return await participantRepo.findOne({ where: { id } });
        },
        async findByUserAndRound(userId: string, roundId: string) {
          return await participantRepo.findOne({ where: { userId, roundId }, relations: ['user'] });
        },
        async findByUserAndRoundForUpdate(userId: string, roundId: string) {
          return await participantRepo
            .createQueryBuilder('p')
            .setLock('pessimistic_write_or_fail')
            .where('p.userId = :userId AND p.roundId = :roundId', { userId, roundId })
            .getOne();
        },
        async findByRound(roundId: string) {
          return await participantRepo.find({ where: { roundId }, relations: ['user'], order: { score: 'DESC' } });
        },
        async findTopByRound(roundId: string, limit = 10) {
          return await participantRepo.find({ where: { roundId }, relations: ['user'], order: { score: 'DESC' }, take: limit });
        },
        async save(p: RoundParticipant) {
          return await participantRepo.save(p);
        },
        async saveWithOptimisticLock(p: RoundParticipant) {
          return await participantRepo.save(p);
        },
        async executeInTransaction<T>(op: (manager: EntityManager) => Promise<T>): Promise<T> {
          return await op(manager);
        },
        create(data: Partial<RoundParticipant>) {
          const now = new Date();
          return participantRepo.create({ ...data, createdAt: now, updatedAt: now });
        },
      };

      return await operation({ roundRepository, participantRepository }, manager);
    });
  }
}


