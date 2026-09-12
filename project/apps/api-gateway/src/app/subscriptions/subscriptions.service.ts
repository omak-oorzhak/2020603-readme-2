import { Injectable } from '@nestjs/common';
import {
  fillRdo,
  fillRdoList,
} from '@project/shared-helpers';
import { BlogClient, type BlogSubscription } from '../clients/blog.client';
import { UsersClient, type UserInfo } from '../clients/users.client';
import { SubscriptionParamDto } from './dto/subscription-param.dto';
import { SubscriptionWithUserRdo } from './rdo/subscription-with-user.rdo';

type EnrichedSubscription = BlogSubscription & { user: UserInfo | null };

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly blogClient: BlogClient,
    private readonly usersClient: UsersClient,
  ) {}

  public async findSubscriptions(
    userId: string,
  ): Promise<SubscriptionWithUserRdo[]> {
    const subscriptions = await this.blogClient.getSubscriptions(userId);
    if (subscriptions.length === 0) {
      return [];
    }
    const userIds = subscriptions.map((s) => s.followingId);
    const userMap = await this.usersClient.getUserInfoMap(userIds);
    const enriched: EnrichedSubscription[] = subscriptions.map((s) => ({
      ...s,
      user: userMap.get(s.followingId) ?? null,
    }));
    return fillRdoList(SubscriptionWithUserRdo, enriched);
  }

  public async subscribe(
    userId: string,
    params: SubscriptionParamDto,
  ): Promise<SubscriptionWithUserRdo> {
    const subscription = await this.blogClient.subscribe(
      userId,
      params.followingId,
    );
    const userMap = await this.usersClient.getUserInfoMap([
      subscription.followingId,
    ]);
    return fillRdo(SubscriptionWithUserRdo, {
      ...subscription,
      user: userMap.get(subscription.followingId) ?? null,
    } satisfies EnrichedSubscription);
  }

  public async unsubscribe(
    userId: string,
    params: SubscriptionParamDto,
  ): Promise<void> {
    await this.blogClient.unsubscribe(userId, params.followingId);
  }
}
