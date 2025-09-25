import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { UserRole } from './user-role.enum';
import { RoundParticipant } from '../round/round-participant.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.SURVIVOR,
  })
  role!: UserRole;

  @Column({ type: 'timestamp' })
  createdAt!: Date;

  @Column({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => RoundParticipant, (participant) => participant.user)
  participations!: RoundParticipant[];

  // Domain methods
  canTap(): boolean {
    return this.role !== UserRole.NIKITA;
  }

  canCreateRounds(): boolean {
    return this.role === UserRole.ADMIN;
  }

  static determineRole(username: string): UserRole {
    const lowercaseUsername = username.toLowerCase();
    
    if (lowercaseUsername === 'admin') {
      return UserRole.ADMIN;
    }
    
    if (lowercaseUsername === 'никита' || lowercaseUsername === 'nikita') {
      return UserRole.NIKITA;
    }
    
    return UserRole.SURVIVOR;
  }
}
