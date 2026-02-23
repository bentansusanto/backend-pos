import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

describe('SessionsController', () => {
  let controller: SessionsController;

  const mockSessionsService = {
    // Add methods if needed by SessionsController
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [
        {
          provide: SessionsService,
          useValue: mockSessionsService,
        },
      ],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
