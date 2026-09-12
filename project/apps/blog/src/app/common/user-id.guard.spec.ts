import type { ExecutionContext } from '@nestjs/common';
import { USER_ID_HEADER } from '@project/shared-types';
import { UserIdGuard, type RequestWithUserId } from './user-id.guard';
import { UserIdNotProvidedError } from './user-id.errors';

function buildContext(headers: Record<string, unknown>): {
  context: ExecutionContext;
  request: RequestWithUserId;
} {
  const request = { headers } as unknown as RequestWithUserId;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('UserIdGuard', () => {
  const guard = new UserIdGuard();

  it('accepts a request with the user id header and exposes it', () => {
    const { context, request } = buildContext({
      [USER_ID_HEADER]: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.userId).toBe('2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011');
  });

  it('rejects a request without the header', () => {
    const { context } = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UserIdNotProvidedError);
  });

  it('rejects a blank header', () => {
    const { context } = buildContext({ [USER_ID_HEADER]: '   ' });

    expect(() => guard.canActivate(context)).toThrow(UserIdNotProvidedError);
  });
});
