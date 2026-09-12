import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AnonymousGuard } from './anonymous.guard';
import { AlreadyAuthenticatedError } from './auth-token.errors';

const TOKEN_CONFIG = {
  accessTokenSecret: 'access-token-secret-for-tests',
  accessTokenExpiresIn: '15m',
  refreshTokenSecret: 'refresh-token-secret-for-tests',
  refreshTokenExpiresIn: '7d',
};

function buildContext(authorization?: string): ExecutionContext {
  const request = { headers: authorization ? { authorization } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AnonymousGuard', () => {
  function buildGuard(verifyAsync: jest.Mock): AnonymousGuard {
    return new AnonymousGuard(
      { verifyAsync } as unknown as JwtService,
      TOKEN_CONFIG,
    );
  }

  it('allows a request without a token', async () => {
    const verifyAsync = jest.fn();
    await expect(
      buildGuard(verifyAsync).canActivate(buildContext()),
    ).resolves.toBe(true);
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('allows a request whose token is invalid', async () => {
    const verifyAsync = jest.fn().mockRejectedValue(new Error('expired'));

    await expect(
      buildGuard(verifyAsync).canActivate(buildContext('Bearer stale.token')),
    ).resolves.toBe(true);
  });

  it('rejects a request with a valid token', async () => {
    const verifyAsync = jest.fn().mockResolvedValue({
      sub: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
      email: 'user@example.com',
      name: 'Иван Иванов',
    });

    await expect(
      buildGuard(verifyAsync).canActivate(buildContext('Bearer good.token')),
    ).rejects.toBeInstanceOf(AlreadyAuthenticatedError);
    expect(verifyAsync).toHaveBeenCalledWith('good.token', {
      secret: TOKEN_CONFIG.accessTokenSecret,
    });
  });

  it('ignores a non-Bearer authorization scheme', async () => {
    const verifyAsync = jest.fn();

    await expect(
      buildGuard(verifyAsync).canActivate(buildContext('Basic dXNlcjpwYXNz')),
    ).resolves.toBe(true);
  });
});
