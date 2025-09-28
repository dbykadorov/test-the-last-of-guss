import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { TapDomainService } from '@domain/tap/tap.domain-service';
import { UserRepositoryPort } from '@domain/user/ports/user.repository.port';
import { RoundRepositoryPort } from '@domain/round/ports/round.repository.port';
import { RoundParticipantRepositoryPort } from '@domain/round/ports/round-participant.repository.port';
import { User } from '@domain/user/user.entity';
import { Round } from '@domain/round/round.entity';
import { RoundParticipant } from '@domain/round/round-participant.entity';
import { UserRole } from '@domain/user/user-role.enum';
import { RoundStatus } from '@domain/round/round-status.enum';
import { TransactionalRunner } from '@infrastructure/transaction/transactional-runner';

describe('TapDomainService', () => {
  let service: TapDomainService;
  let userRepository: jest.Mocked<UserRepositoryPort>;
  let roundRepository: jest.Mocked<RoundRepositoryPort>;
  let participantRepository: jest.Mocked<RoundParticipantRepositoryPort>;
  let transactionalRunner: jest.Mocked<TransactionalRunner>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TapDomainService,
        {
          provide: 'UserRepositoryPort',
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: 'RoundRepositoryPort',
          useValue: {
            findById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: 'RoundParticipantRepositoryPort',
          useValue: {
            findByUserAndRound: jest.fn(),
            findByUserAndRoundForUpdate: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            saveWithOptimisticLock: jest.fn(),
          },
        },
        {
          provide: TransactionalRunner,
          useValue: {
            runInTransaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TapDomainService>(TapDomainService);
    userRepository = module.get('UserRepositoryPort');
    roundRepository = module.get('RoundRepositoryPort');
    participantRepository = module.get('RoundParticipantRepositoryPort');
    transactionalRunner = module.get(TransactionalRunner);
  });

  describe('executeTap', () => {
    const userId = 'user-id';
    const roundId = 'round-id';

    it('should successfully execute tap for regular user', async () => {
      // Arrange
      const user = new User();
      user.id = userId;
      user.role = UserRole.SURVIVOR;

      const round = new Round();
      round.id = roundId;
      round.status = RoundStatus.ACTIVE;
      round.totalScore = '0';
      jest.spyOn(round, 'canAcceptTaps').mockReturnValue(true);

      const participant = new RoundParticipant();
      participant.userId = userId;
      participant.roundId = roundId;
      participant.score = 10;
      participant.tapsCount = 10;

      userRepository.findById.mockResolvedValue(user);
      roundRepository.findById.mockResolvedValue(round);
      
      // Mock TransactionalRunner
      ;(transactionalRunner.runInTransaction as jest.Mock).mockImplementation(async (cb) => {
        return await cb({
          participantRepository,
          roundRepository: roundRepository as any,
        } as any, {} as any);
      });
      
      participantRepository.findByUserAndRoundForUpdate.mockResolvedValue(participant);
      participantRepository.saveWithOptimisticLock.mockResolvedValue(participant);
      roundRepository.incrementTotalScore = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.executeTap(userId, roundId);

      // Assert
      expect(result.myScore).toBe(20); // 10 + 10 (11th tap bonus)
      expect(result.tapsCount).toBe(11);
      expect(result.bonusEarned).toBe(true);
      expect(participantRepository.saveWithOptimisticLock).toHaveBeenCalled();
      expect(roundRepository.incrementTotalScore).toHaveBeenCalledWith(roundId, 10);
    });

    it('should return zeros for Nikita user', async () => {
      // Arrange
      const user = new User();
      user.id = userId;
      user.role = UserRole.NIKITA;

      const round = new Round();
      round.id = roundId;
      round.status = RoundStatus.ACTIVE;
      jest.spyOn(round, 'canAcceptTaps').mockReturnValue(true);

      const participant = new RoundParticipant();
      participant.userId = userId;
      participant.roundId = roundId;

      userRepository.findById.mockResolvedValue(user);
      roundRepository.findById.mockResolvedValue(round);
      
      ;(transactionalRunner.runInTransaction as jest.Mock).mockImplementation(async (cb) => {
        return await cb({ participantRepository, roundRepository: roundRepository as any } as any, {} as any);
      });
      
      participantRepository.findByUserAndRoundForUpdate.mockResolvedValue(participant);

      // Act
      const result = await service.executeTap(userId, roundId);

      // Assert
      expect(result.myScore).toBe(0);
      expect(result.tapsCount).toBe(0);
      expect(result.bonusEarned).toBe(false);
      expect(result.scoreEarned).toBe(0);
    });

    it('should throw BadRequestException when user not found', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.executeTap(userId, roundId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when round not found', async () => {
      // Arrange
      const user = new User();
      userRepository.findById.mockResolvedValue(user);
      roundRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.executeTap(userId, roundId)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when round is not active', async () => {
      // Arrange
      const user = new User();
      const round = new Round();
      round.status = RoundStatus.FINISHED;
      jest.spyOn(round, 'canAcceptTaps').mockReturnValue(false);

      userRepository.findById.mockResolvedValue(user);
      roundRepository.findById.mockResolvedValue(round);

      // Act & Assert
      await expect(service.executeTap(userId, roundId)).rejects.toThrow(BadRequestException);
    });

    it('should handle optimistic locking conflict', async () => {
      // Arrange
      const user = new User();
      user.role = UserRole.SURVIVOR;
      const round = new Round();
      jest.spyOn(round, 'canAcceptTaps').mockReturnValue(true);
      const participant = new RoundParticipant();

      userRepository.findById.mockResolvedValue(user);
      roundRepository.findById.mockResolvedValue(round);
      
      ;(transactionalRunner.runInTransaction as jest.Mock).mockImplementation(async (cb) => {
        return await cb({ participantRepository, roundRepository: roundRepository as any } as any, {} as any);
      });
      
      participantRepository.findByUserAndRoundForUpdate.mockResolvedValue(participant);
      participantRepository.saveWithOptimisticLock.mockRejectedValue(
        new Error('version conflict')
      );

      // Act & Assert
      await expect(service.executeTap(userId, roundId)).rejects.toThrow(ConflictException);
    });

    it('should handle race conditions with pessimistic locking', async () => {
      // Arrange
      const user = new User();
      user.id = userId;
      user.role = UserRole.SURVIVOR;

      const round = new Round();
      round.id = roundId;
      round.status = RoundStatus.ACTIVE;
      round.totalScore = '0';
      jest.spyOn(round, 'canAcceptTaps').mockReturnValue(true);

      const participant = new RoundParticipant();
      participant.userId = userId;
      participant.roundId = roundId;
      participant.score = 0;
      participant.tapsCount = 0;

      userRepository.findById.mockResolvedValue(user);
      roundRepository.findById.mockResolvedValue(round);
      
      ;(transactionalRunner.runInTransaction as jest.Mock).mockImplementation(async (cb) => {
        return await cb({ participantRepository, roundRepository: roundRepository as any } as any, {} as any);
      });
      
      // Mock pessimistic locking
      participantRepository.findByUserAndRoundForUpdate.mockResolvedValue(participant);
      participantRepository.saveWithOptimisticLock.mockResolvedValue(participant);
      roundRepository.incrementTotalScore = jest.fn().mockResolvedValue(undefined);

      // Act - simulate concurrent taps
      const tapPromises = Array.from({ length: 5 }, () => 
        service.executeTap(userId, roundId)
      );
      
      const results = await Promise.allSettled(tapPromises);

      // Assert
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
      expect(transactionalRunner.runInTransaction).toHaveBeenCalledTimes(5);
      expect(participantRepository.findByUserAndRoundForUpdate).toHaveBeenCalledTimes(5);
      expect(roundRepository.incrementTotalScore).toHaveBeenCalledTimes(5);
    });

    it('should create participant with pessimistic locking when not exists', async () => {
      // Arrange
      const user = new User();
      user.id = userId;
      user.role = UserRole.SURVIVOR;

      const round = new Round();
      round.id = roundId;
      round.status = RoundStatus.ACTIVE;
      round.totalScore = '0';
      jest.spyOn(round, 'canAcceptTaps').mockReturnValue(true);

      const newParticipant = new RoundParticipant();
      newParticipant.userId = userId;
      newParticipant.roundId = roundId;
      newParticipant.score = 0;
      newParticipant.tapsCount = 0;

      userRepository.findById.mockResolvedValue(user);
      roundRepository.findById.mockResolvedValue(round);
      
      ;(transactionalRunner.runInTransaction as jest.Mock).mockImplementation(async (cb) => {
        return await cb({ participantRepository, roundRepository: roundRepository as any } as any, {} as any);
      });
      
      // First call returns null (participant doesn't exist)
      // Second call returns participant after creation
      participantRepository.findByUserAndRoundForUpdate
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newParticipant);
      
      participantRepository.create.mockReturnValue(newParticipant);
      participantRepository.save.mockResolvedValue(newParticipant);
      participantRepository.saveWithOptimisticLock.mockResolvedValue(newParticipant);
      roundRepository.incrementTotalScore = jest.fn().mockResolvedValue(undefined);

      // Act
      const result = await service.executeTap(userId, roundId);

      // Assert
      expect(result.myScore).toBe(1); // First tap = 1 point
      expect(result.tapsCount).toBe(1);
      expect(result.bonusEarned).toBe(false);
      expect(participantRepository.create).toHaveBeenCalledWith({ userId, roundId });
      expect(participantRepository.findByUserAndRoundForUpdate).toHaveBeenCalledTimes(2);
      expect(roundRepository.incrementTotalScore).toHaveBeenCalledWith(roundId, 1);
    });
  });
});
