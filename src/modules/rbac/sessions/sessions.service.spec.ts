import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { SessionsService } from './sessions.service';

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionRepository: Repository<Session>;

  const mockSession = {
    id: 'session-id',
    token: 'token-hash',
    user: { id: 'user-id', isActive: true },
    expiresAt: new Date(Date.now() + 10000),
    ip: '127.0.0.1',
    device: 'Test Device',
  };

  const mockLogger = {
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: getRepositoryToken(Session),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    sessionRepository = module.get<Repository<Session>>(
      getRepositoryToken(Session),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findValidSession', () => {
    it('should return session if valid', async () => {
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(mockSession as any);

      const result = await service.findValidSession('token-hash');

      expect(sessionRepository.findOne).toHaveBeenCalledWith({
        where: { token: 'token-hash' },
        relations: {
          user: {
            role: true,
            userBranches: {
              branch: true,
            },
          },
          currentBranch: true,
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('should return null if session not found', async () => {
      jest.spyOn(sessionRepository, 'findOne').mockResolvedValue(null);

      const result = await service.findValidSession('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null and remove session if expired', async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 10000),
      };
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(expiredSession as any);
      jest.spyOn(sessionRepository, 'remove').mockResolvedValue({} as any);

      const result = await service.findValidSession('token-hash');

      expect(sessionRepository.remove).toHaveBeenCalledWith(expiredSession);
      expect(result).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create and save a session', async () => {
      jest
        .spyOn(sessionRepository, 'create')
        .mockReturnValue(mockSession as any);
      jest
        .spyOn(sessionRepository, 'save')
        .mockResolvedValue(mockSession as any);

      const result = await service.createSession(
        mockSession.user as any,
        'token-hash',
        mockSession.expiresAt,
        mockSession.ip,
        mockSession.device,
      );

      expect(sessionRepository.create).toHaveBeenCalled();
      expect(sessionRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });

  describe('removeSession', () => {
    it('should remove a session', async () => {
      jest
        .spyOn(sessionRepository, 'findOne')
        .mockResolvedValue(mockSession as any);
      jest.spyOn(sessionRepository, 'remove').mockResolvedValue({} as any);

      await service.removeSession('token-hash');

      expect(sessionRepository.remove).toHaveBeenCalledWith(mockSession);
    });

    it('should handle session not found gracefully', async () => {
      jest.spyOn(sessionRepository, 'findOne').mockResolvedValue(null);

      await service.removeSession('invalid-token');

      expect(sessionRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('removeAllUserSessions', () => {
    it('should delete all sessions for a user', async () => {
      jest.spyOn(sessionRepository, 'delete').mockResolvedValue({} as any);

      await service.removeAllUserSessions('user-id');

      expect(sessionRepository.delete).toHaveBeenCalledWith({
        user: { id: 'user-id' },
      });
    });
  });
});
