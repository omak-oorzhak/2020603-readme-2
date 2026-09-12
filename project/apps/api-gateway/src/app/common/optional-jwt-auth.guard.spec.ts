import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { TokenPayload } from '@project/shared-types';
import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';

const TOKEN_CONFIG = {
  accessTokenSecret: 'access-token-secret-for-tests',
  accessTokenExpiresIn: '15m',
  refreshTokenSecret: 'refresh-token-secret-for-tests',
  refreshTokenExpiresIn: '7d',
};

function buildContext(authorization?: string): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; user?: TokenPayload };
} {
  const request: { headers: Record<string, string>; user?: TokenPayload } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('OptionalJwtAuthGuard', () => {
  function buildGuard(verifyAsync: jest.Mock): OptionalJwtAuthGuard {
    return new OptionalJwtAuthGuard(
      { verifyAsync } as unknown as JwtService,
      TOKEN_CONFIG,
    );
  }

  it('passes through an anonymous request', async () => {
    const verifyAsync = jest.fn();
    const { context, request } = buildContext();

    await expect(buildGuard(verifyAsync).canActivate(context)).resolves.toBe(
      true,
    );
    expect(request.user).toBeUndefined();
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('exposes the payload for a valid token', async () => {
    const payload: TokenPayload = {
      sub: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
      email: 'user@example.com',
      name: 'Иван Иванов',
    };
    const verifyAsync = jest.fn().mockResolvedValue(payload);
    const { context, request } = buildContext('Bearer good.token');

    await expect(buildGuard(verifyAsync).canActivate(context)).resolves.toBe(
      true,
    );
    expect(request.user).toEqual(payload);
  });

  it('stays public when the token is invalid', async () => {
    const verifyAsync = jest.fn().mockRejectedValue(new Error('expired'));
    const { context, request } = buildContext('Bearer stale.token');

    await expect(buildGuard(verifyAsync).canActivate(context)).resolves.toBe(
      true,
    );
    expect(request.user).toBeUndefined();
  });
});
