import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { RoundStatus } from './round-status.enum';
import { RoundParticipant } from './round-participant.entity';

@Entity('rounds')
export class Round {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp' })
  endTime!: Date;

  @Column({
    type: 'enum',
    enum: RoundStatus,
    default: RoundStatus.COOLDOWN,
  })
  status!: RoundStatus;

  @Column({ type: 'bigint', default: 0 })
  totalScore!: string;

  @Column({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => RoundParticipant, (participant) => participant.round, {
    cascade: true,
  })
  participants!: RoundParticipant[];

  // Domain methods
  isActive(): boolean {
    const now = new Date();
    return now >= this.startTime && now <= this.endTime;
  }

  isInCooldown(): boolean {
    const now = new Date();
    return now < this.startTime;
  }

  isFinished(): boolean {
    const now = new Date();
    return now > this.endTime;
  }

  updateStatus(): void {
    if (this.isInCooldown()) {
      this.status = RoundStatus.COOLDOWN;
    } else if (this.isActive()) {
      this.status = RoundStatus.ACTIVE;
    } else if (this.isFinished()) {
      this.status = RoundStatus.FINISHED;
    }
  }

  canAcceptTaps(): boolean {
    this.updateStatus();
    return this.status === RoundStatus.ACTIVE;
  }

  static create(cooldownSeconds: number, durationSeconds: number): Round {
    const round = new Round();
    // используем UTC время для консистентности с базой
    const nowUtc = new Date();
    
    // устанавливаем время создания для консистентности
    round.createdAt = nowUtc;
    round.updatedAt = nowUtc;
    
    round.startTime = new Date(nowUtc.getTime() + cooldownSeconds * 1000);
    round.endTime = new Date(round.startTime.getTime() + durationSeconds * 1000);
    
    round.status = RoundStatus.COOLDOWN;
    round.totalScore = '0';
    
    return round;
  }
}
