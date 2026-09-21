import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { UserService } from '../user/user.service';

describe('AuthenticationController', () => {
  let controller: AuthenticationController;

  beforeEach(async () => {
    const authenticationServiceMock: Partial<AuthenticationService> = {
      register: jest.fn(),
      verifyUser: jest.fn(),
      createTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
      changePassword: jest.fn(),
    };
    const userServiceMock: Partial<UserService> = {
      getById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useValue: authenticationServiceMock },
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
