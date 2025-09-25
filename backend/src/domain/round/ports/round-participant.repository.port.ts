import { RoundParticipant } from '../round-participant.entity';
import { EntityManager } from 'typeorm';

export interface RoundParticipantRepositoryPort {
  findById(id: string): Promise<RoundParticipant | null>;
  findByUserAndRound(userId: string, roundId: string): Promise<RoundParticipant | null>;
  findByUserAndRoundForUpdate(userId: string, roundId: string): Promise<RoundParticipant | null>;
  findByRound(roundId: string): Promise<RoundParticipant[]>;
  findTopByRound(roundId: string, limit?: number): Promise<RoundParticipant[]>;
  save(participant: RoundParticipant): Promise<RoundParticipant>;
  saveWithOptimisticLock(participant: RoundParticipant): Promise<RoundParticipant>;
  executeInTransaction<T>(operation: (manager: EntityManager) => Promise<T>): Promise<T>;
  create(participantData: Partial<RoundParticipant>): RoundParticipant;
}

export const RoundParticipantRepositoryPort = Symbol('RoundParticipantRepositoryPort');
