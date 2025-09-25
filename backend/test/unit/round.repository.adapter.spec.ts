import { RoundRepositoryAdapter } from '@infrastructure/adapters/round.repository.adapter';
import { EntityManager, Repository } from 'typeorm';
import { Round } from '@domain/round/round.entity';

describe('RoundRepositoryAdapter.incrementTotalScore', () => {
  it('uses query builder with bigint-safe increment inside provided manager', async () => {
    const baseRepo = {} as unknown as Repository<Round>;
    const adapter = new RoundRepositoryAdapter(baseRepo);

    const execute = jest.fn().mockResolvedValue(undefined);
    const setParameters = jest.fn().mockReturnValue({ execute });
    const where = jest.fn().mockReturnValue({ setParameters, execute });
    const set = jest.fn().mockReturnValue({ where, setParameters, execute });
    const update = jest.fn().mockReturnValue({ set, where, setParameters, execute });
    const createQueryBuilder = jest.fn().mockReturnValue({ update, set, where, setParameters, execute });
    const repoMock = { createQueryBuilder } as unknown as Repository<Round>;

    const manager = {
      getRepository: jest.fn().mockReturnValue(repoMock),
    } as unknown as EntityManager;

    await adapter.incrementTotalScore('round-1', 2, manager);

    expect(manager.getRepository).toHaveBeenCalledWith(Round);
    expect(createQueryBuilder).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(Round);
    expect(set).toHaveBeenCalledWith({ totalScore: expect.any(Function) });
    expect(where).toHaveBeenCalledWith('id = :id', { id: 'round-1' });
    expect(execute).toHaveBeenCalled();
  });
});


