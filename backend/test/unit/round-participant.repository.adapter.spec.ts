import { RoundParticipantRepositoryAdapter } from '@infrastructure/adapters/round-participant.repository.adapter';
import { DataSource, Repository } from 'typeorm';
import { RoundParticipant } from '@domain/round/round-participant.entity';

describe('RoundParticipantRepositoryAdapter.findByUserAndRoundForUpdate', () => {
  it('builds a lock query without joins', async () => {
    const repo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            getOne: jest.fn().mockResolvedValue(null),
          }),
        }),
      }),
    } as unknown as Repository<RoundParticipant>;

    const ds = { transaction: jest.fn() } as unknown as DataSource;
    const adapter = new RoundParticipantRepositoryAdapter(repo as any, ds as any);

    await adapter.findByUserAndRoundForUpdate('u1', 'r1');

    expect(repo.createQueryBuilder).toHaveBeenCalledWith('p');
  });
});


