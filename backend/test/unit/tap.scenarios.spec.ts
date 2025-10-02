import { TapDomainService } from '../../src/domain/tap/tap.domain-service';
import { TransactionalRunner } from '../../src/infrastructure/transaction/transactional-runner';
import { RoundParticipant } from '../../src/domain/round/round-participant.entity';
import { Round } from '../../src/domain/round/round.entity';
import { User } from '../../src/domain/user/user.entity';
import { UserRole } from '../../src/domain/user/user-role.enum';
import { RoundStatus } from '../../src/domain/round/round-status.enum';

/**
 * Проверяем корректность начисления очков:
 * - 1 очко за обычный тап
 * - 10 очков за каждый 11-й тап (т.е. tapsCount % 11 === 0)
 */
function simulateTaps(participant: RoundParticipant, n: number): number {
  let delta = 0;
  for (let i = 0; i < n; i++) {
    const before = participant.score;
    const res = participant.addTap();
    delta += res.scoreEarned;
    if (participant.score !== before + res.scoreEarned) {
      throw new Error('Score not applied correctly');
    }
  }
  return delta;
}

describe('Tap scenarios scoring', () => {
  const user: User = Object.assign(new User(), {
    id: 'u1', username: 'player1', role: UserRole.SURVIVOR,
  });
  const round: Round = Object.assign(new Round(), {
    id: 'r1', startTime: new Date(Date.now() - 1000), endTime: new Date(Date.now() + 60_000), status: RoundStatus.ACTIVE, totalScore: '0',
  });

  it('accumulates correct score for sequential taps (1..N)', () => {
    const p = Object.assign(new RoundParticipant(), {
      id: 'p1', userId: user.id, roundId: round.id, score: 0, tapsCount: 0,
    });

    const N = 35; // включает 3 бонусных: 11, 22, 33
    const gained = simulateTaps(p, N);
    // Ожидаем: (N - floor(N/11)) обычных по 1 + floor(N/11) бонусов по 10
    const bonuses = Math.floor(N / 11);
    const expected = (N - bonuses) * 1 + bonuses * 10;
    expect(gained).toBe(expected);
    expect(p.score).toBe(expected);
    expect(p.tapsCount).toBe(N);
  });

  it('correctly continues from non-zero state and hits bonus boundary', () => {
    const p = Object.assign(new RoundParticipant(), {
      id: 'p1', userId: user.id, roundId: round.id, score: 5, tapsCount: 5,
    });
    // До бонуса осталось 5 тапов: 6,7,8,9,10 → обычные, 11-й даст +10
    const gained = simulateTaps(p, 6);
    // Первые 5 дадут +1, последний (11-й) +10 → итого +15
    expect(gained).toBe(15);
    expect(p.score).toBe(5 + 15);
    expect(p.tapsCount).toBe(11);
  });

  it('multiple bursts sum equals sequential taps', () => {
    const p1 = Object.assign(new RoundParticipant(), { id: 'p1', userId: user.id, roundId: round.id, score: 0, tapsCount: 0 });
    const p2 = Object.assign(new RoundParticipant(), { id: 'p2', userId: user.id, roundId: round.id, score: 0, tapsCount: 0 });

    const bursts = [3, 7, 10, 1, 15, 22];
    const sumN = bursts.reduce((a, b) => a + b, 0);

    const delta1 = bursts.reduce((acc, n) => acc + simulateTaps(p1, n), 0);
    const delta2 = simulateTaps(p2, sumN);

    expect(delta1).toBe(delta2);
    expect(p1.score).toBe(p2.score);
    expect(p1.tapsCount).toBe(p2.tapsCount);
  });
});
