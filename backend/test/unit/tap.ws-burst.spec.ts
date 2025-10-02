import { TapDomainService } from '../../src/domain/tap/tap.domain-service';
import { TransactionalRunner } from '../../src/infrastructure/transaction/transactional-runner';
import { RoundParticipant } from '../../src/domain/round/round-participant.entity';
import { Round } from '../../src/domain/round/round.entity';
import { User } from '../../src/domain/user/user.entity';
import { UserRole } from '../../src/domain/user/user-role.enum';
import { RoundStatus } from '../../src/domain/round/round-status.enum';

describe('TapDomainService burst over WS semantics (sequential in DB)', () => {
  const user: User = Object.assign(new User(), { id: 'u1', username: 'p', role: UserRole.SURVIVOR });
  const round: Round = Object.assign(new Round(), {
    id: 'r1', startTime: new Date(Date.now() - 1000), endTime: new Date(Date.now() + 60_000), status: RoundStatus.ACTIVE, totalScore: '0',
  });
  const participant: RoundParticipant = Object.assign(new RoundParticipant(), {
    id: 'p1', userId: user.id, roundId: round.id, score: 0, tapsCount: 0,
  });

  // Моки для последовательного выполнения «взрывов» как очереди (pessimistic_write обеспечивает порядок)
  const repos = {
    roundRepository: {
      findById: async (id: string) => (id === round.id ? round : null),
      incrementTotalScore: async () => undefined,
    },
    participantRepository: {
      findByUserAndRoundForUpdate: async () => participant,
      create: (d: Partial<RoundParticipant>) => Object.assign(new RoundParticipant(), d),
      save: async (p: RoundParticipant) => p,
      saveWithOptimisticLock: async (p: RoundParticipant) => p,
    },
  } as any;

  const runner: TransactionalRunner = {
    runInTransaction: async (op: any) => op(repos, {}),
  } as any;

  const makeService = () => {
    const userRepo = { findById: async (id: string) => (id === user.id ? user : null) } as any;
    const roundRepo = { findById: async (id: string) => (id === round.id ? round : null) } as any;
    return new TapDomainService(userRepo, roundRepo, {} as any, runner);
  };

  it('burst of N taps yields same score as sequential N', async () => {
    const service = makeService();
    const N = 217;
    let lastScore = 0;
    for (let i = 0; i < N; i++) {
      const res = await service.executeTap(user.id, round.id);
      lastScore = res.myScore;
    }
    // Вычислим ожидаемое: каждые 11-й даёт +10 вместо +1 → бонус = 9 дополнительных очков на каждые 11
    const bonuses = Math.floor(N / 11);
    const expected = (N - bonuses) * 1 + bonuses * 10;
    expect(lastScore).toBe(expected);
    expect(participant.tapsCount).toBe(N);
  });
});


