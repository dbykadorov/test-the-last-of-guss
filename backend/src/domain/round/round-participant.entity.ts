import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, VersionColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Round } from './round.entity';

@Entity('round_participants')
@Index(['userId', 'roundId'], { unique: true })
export class RoundParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  roundId!: string;

  @Column({ type: 'integer', default: 0 })
  score!: number;

  @Column({ type: 'integer', default: 0 })
  tapsCount!: number;

  @VersionColumn()
  version!: number;

  @Column({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.participations)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Round, (round) => round.participants)
  @JoinColumn({ name: 'roundId' })
  round!: Round;

  addTap(): { scoreEarned: number; bonusEarned: boolean } {
    this.tapsCount += 1;
    
    // каждый 11й тап - 10 очков, обычный 1 очко
    const isBonus = this.tapsCount % 11 === 0;
    const scoreEarned = isBonus ? 10 : 1;
    
    // бигинт приходит как строка, скучаю по Python...
    this.score = Number(this.score) + scoreEarned;
    
    return {
      scoreEarned,
      bonusEarned: isBonus,
    };
  }

  static create(userId: string, roundId: string): RoundParticipant {
    const participant = new RoundParticipant();
    const now = new Date();
    
    participant.userId = userId;
    participant.roundId = roundId;
    participant.score = 0;
    participant.tapsCount = 0;
    participant.createdAt = now;
    participant.updatedAt = now;
    
    return participant;
  }
}
