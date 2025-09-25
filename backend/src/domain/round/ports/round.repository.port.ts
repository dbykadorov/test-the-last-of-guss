import { Round } from '../round.entity';
import { EntityManager } from 'typeorm';

export interface RoundRepositoryPort {
  findById(id: string): Promise<Round | null>;
  findByIdWithParticipants(id: string): Promise<Round | null>;
  findAll(): Promise<Round[]>;
  findAllWithStatus(): Promise<Round[]>;
  save(round: Round): Promise<Round>;
  create(roundData: Partial<Round>): Round;
  incrementTotalScore(roundId: string, delta: number, manager?: EntityManager): Promise<void>;
}

export const RoundRepositoryPort = Symbol('RoundRepositoryPort');
