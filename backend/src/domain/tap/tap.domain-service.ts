import { Injectable, BadRequestException, ConflictException, Inject, Logger } from '@nestjs/common';
import { TapResult } from './tap-result.value-object';
import { TapServicePort } from './ports/tap.service.port';
import { UserRepositoryPort } from '../user/ports/user.repository.port';
import { RoundRepositoryPort } from '../round/ports/round.repository.port';
import { RoundParticipantRepositoryPort } from '../round/ports/round-participant.repository.port';
import { UserRole } from '../user/user-role.enum';
import { TransactionalRunner } from '@infrastructure/transaction/transactional-runner';

@Injectable()
export class TapDomainService implements TapServicePort {
  private readonly logger = new Logger(TapDomainService.name);
  constructor(
    @Inject('UserRepositoryPort')
    private readonly userRepository: UserRepositoryPort,
    @Inject('RoundRepositoryPort')
    private readonly roundRepository: RoundRepositoryPort,
    @Inject('RoundParticipantRepositoryPort')
    private readonly participantRepository: RoundParticipantRepositoryPort,
    private readonly transactionalRunner: TransactionalRunner,
  ) {}

  async executeTap(userId: string, roundId: string): Promise<TapResult> {
    this.logger.debug(`Tap requested: userId=${userId}, roundId=${roundId}`);

    // 1. Verify user exists and can tap
    const user = await this.userRepository.findById(userId);
    if (!user) {
      this.logger.warn(`Tap rejected: user not found (userId=${userId})`);
      throw new BadRequestException('User not found');
    }

    // 2. Verify round exists and is active
    const round = await this.roundRepository.findById(roundId);
    if (!round) {
      this.logger.warn(`Tap rejected: round not found (roundId=${roundId})`);
      throw new BadRequestException('Round not found');
    }

    if (!round.canAcceptTaps()) {
      this.logger.warn(`Tap rejected: round not active (roundId=${roundId}, status=${round.status})`);
      throw new BadRequestException(`Round is not active. Current status: ${round.status}`);
    }

    // 3. Execute with short retries for transient lock failures
    const maxAttempts = 3;
    const baseDelay = 10; // ms

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.transactionalRunner.runInTransaction(async ({ participantRepository, roundRepository }, manager) => {
          // Find participant with pessimistic lock (or fail fast under contention)
          let participant = await participantRepository.findByUserAndRoundForUpdate(userId, roundId);
          
          if (!participant) {
            this.logger.debug(`Creating participant (userId=${userId}, roundId=${roundId})`);
            participant = participantRepository.create({ userId, roundId });
            participant = await participantRepository.save(participant);
            participant = await participantRepository.findByUserAndRoundForUpdate(userId, roundId);
            if (!participant) {
              this.logger.error(`Failed to create or lock participant (userId=${userId}, roundId=${roundId})`);
              throw new ConflictException('Failed to create or lock participant');
            }
          }

          if (user.role === UserRole.NIKITA) {
            this.logger.debug(`Tap by Nikita ignored (userId=${userId})`);
            return TapResult.create(0, 0, false, 0);
          }

          const tapResult = participant.addTap();
          this.logger.debug(`Tap computed (userId=${userId}, roundId=${roundId}, scoreEarned=${tapResult.scoreEarned}, bonus=${tapResult.bonusEarned})`);
          await participantRepository.saveWithOptimisticLock(participant);
          await roundRepository.incrementTotalScore(roundId, Number(tapResult.scoreEarned));
          this.logger.debug(`Round totalScore incremented (roundId=${roundId}, delta=${tapResult.scoreEarned})`);

          return TapResult.create(
            Number(participant.score),
            participant.tapsCount,
            tapResult.bonusEarned,
            tapResult.scoreEarned,
          );
        });
      } catch (error: any) {
        const message = error?.message ?? '';
        const isLockFail = message.includes('nowait') || message.includes('could not obtain lock') || message.includes('pessimistic');
        if (isLockFail && attempt < maxAttempts) {
          const delay = baseDelay + Math.floor(Math.random() * baseDelay);
          this.logger.warn(`Tap lock retry ${attempt}/${maxAttempts - 1} (userId=${userId}, roundId=${roundId}): ${message}`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        if (error instanceof ConflictException || error.code === '23505' || message.includes('version')) {
          this.logger.warn(`Tap conflict detected (userId=${userId}, roundId=${roundId}): ${message}`);
          throw new ConflictException('Tap conflict detected, please try again');
        }
        this.logger.error(`Tap failed (userId=${userId}, roundId=${roundId})`, error?.stack ?? String(error));
        throw error;
      }
    }

    // При нормальном развитии событий сюда мы попасть не должны, раз уж попали, кидаем исключение
    throw new ConflictException('Tap temporarily unavailable, please retry');
  }
}
