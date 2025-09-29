import { Test } from '@nestjs/testing';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { TransactionalRunner } from '@infrastructure/transaction/transactional-runner';
import { Round } from '@domain/round/round.entity';
import { RoundParticipant } from '@domain/round/round-participant.entity';

describe('TransactionalRunner', () => {
  let runner: TransactionalRunner;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    dataSource = {
      transaction: jest.fn(),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [TransactionalRunner, { provide: DataSource, useValue: dataSource }],
    }).compile();

    runner = moduleRef.get(TransactionalRunner);
  });

  it('binds repositories to the same manager and executes operation', async () => {
    const roundRepoMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              setParameters: jest.fn().mockReturnValue({ execute: jest.fn().mockResolvedValue(undefined) }),
            }),
          }),
        }),
      }),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as Repository<Round>;

    const participantRepoMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({ getOne: jest.fn().mockResolvedValue(null) }),
        }),
      }),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    } as unknown as Repository<RoundParticipant>;

    const manager = {
      getRepository: jest
        .fn()
        .mockImplementation((entity) => (entity === Round ? roundRepoMock : participantRepoMock)),
    } as unknown as EntityManager;

    (dataSource.transaction as any).mockImplementation(async (cb: any) => cb(manager));

    const result = await runner.runInTransaction(async ({ roundRepository, participantRepository }) => {
      await roundRepository.incrementTotalScore('r1', 1);
      await participantRepository.findByUserAndRoundForUpdate('u1', 'r1');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect((manager.getRepository as any)).toHaveBeenCalledWith(Round);
    expect((manager.getRepository as any)).toHaveBeenCalledWith(RoundParticipant);
  });
});


