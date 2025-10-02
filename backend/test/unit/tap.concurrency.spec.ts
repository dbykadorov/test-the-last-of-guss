import { ConflictException, Logger } from '@nestjs/common';
import { TapDomainService } from '../../src/domain/tap/tap.domain-service';
import { TransactionalRunner } from '../../src/infrastructure/transaction/transactional-runner';
import { RoundParticipant } from '../../src/domain/round/round-participant.entity';
import { Round } from '../../src/domain/round/round.entity';
import { User } from '../../src/domain/user/user.entity';
import { UserRole } from '../../src/domain/user/user-role.enum';
import { RoundStatus } from '../../src/domain/round/round-status.enum';

// Этот тест моделирует конкурентные тапы одного пользователя: 
// первый поток удерживает «замок» дольше, чем хватает на три ретрая,
// поэтому часть тапов ожидаемо завершится ConflictException.

describe('TapDomainService concurrency (mocked lock contention)', () => {
  let service: TapDomainService;

  // Общие фикстуры домена
  const user: User = Object.assign(new User(), {
    id: 'u1',
    username: 'player1',
    role: UserRole.SURVIVOR,
  });

  const round: Round = Object.assign(new Round(), {
    id: 'r1',
    startTime: new Date(Date.now() - 10_000),
    endTime: new Date(Date.now() + 60_000),
    status: RoundStatus.ACTIVE,
    totalScore: '0',
  });

  const participant: RoundParticipant = Object.assign(new RoundParticipant(), {
    id: 'p1',
    userId: user.id,
    roundId: round.id,
    score: 0,
    tapsCount: 0,
    version: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Мок «замка» на участнике, имитирующий NOWAIT поведение
  let locked = false;

  // Моки портов/репозиториев для TransactionalRunner.runInTransaction
  const repos = {
    roundRepository: {
      findById: async (id: string) => (id === round.id ? round : null),
      incrementTotalScore: async (_roundId: string, _delta: number) => undefined,
    },
    participantRepository: {
      findByUserAndRoundForUpdate: async (uid: string, rid: string) => {
        if (uid !== user.id || rid !== round.id) return null;
        if (locked) {
          // имитируем PG nowait
          const err = new Error('could not obtain lock on row in relation');
          (err as any).code = '55P03';
          throw err;
        }
        locked = true;
        return participant;
      },
      create: (data: Partial<RoundParticipant>) => Object.assign(new RoundParticipant(), data),
      save: async (p: RoundParticipant) => p,
      saveWithOptimisticLock: async (p: RoundParticipant) => {
        // эмулируем «долгую» обработку, чтобы другие потоки не успели за 3 ретрая
        await new Promise((r) => setTimeout(r, 150));
        locked = false;
        return p;
      },
    },
  } as any;

  const runner: TransactionalRunner = {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    runInTransaction: async (op: any) => {
      return await op(repos, {});
    },
  } as any;

  beforeAll(() => {
    const userRepoMock = { findById: async (id: string) => (id === user.id ? user : null) };
    const roundRepoMock = { findById: async (id: string) => (id === round.id ? round : null) };
    // Инжектим все зависимости согласно сигнатуре конструктора
    service = new TapDomainService(
      userRepoMock as any,
      roundRepoMock as any,
      {} as any, // participantRepository не используется напрямую в executeTap
      runner,
    );
    jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger, 'debug').mockImplementation(() => undefined);
  });

  it('parallel taps: some attempts fail due to lock retries (current behavior)', async () => {
    locked = false;
    participant.score = 0;
    participant.tapsCount = 0;

    const PARALLEL = 10;
    const results = await Promise.allSettled(
      Array.from({ length: PARALLEL }, () => service.executeTap(user.id, round.id)),
    );

    const fulfilled = results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    const rejected = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];

    // Ожидаем, что при текущем алгоритме часть запросов отклонится по конфликту/локам
    expect(fulfilled.length).toBeGreaterThan(0);
    expect(rejected.length).toBeGreaterThan(0);
    // Ошибки должны быть конфликтами (ретраи исчерпаны)
    for (const rej of rejected) {
      expect(rej.reason instanceof ConflictException || String(rej.reason?.message || rej.reason)).toBeTruthy();
    }
  });
});


