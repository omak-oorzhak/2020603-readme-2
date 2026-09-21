import { Injectable } from '@nestjs/common';
import type { Subscription } from '@project/shared-types';
import {
  SelfSubscriptionError,
  SubscriptionAlreadyExistsError,
  SubscriptionNotFoundError,
} from './subscription.errors';
import { SubscriptionRepository } from './subscription.repository';

@Injectable()
export class SubscriptionService {
  constructor(private readonly subscriptionRepository: SubscriptionRepository) {}

  public async findSubscriptions(followerId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.findByFollower(followerId);
  }

  /** Идентификаторы авторов, на которых подписан пользователь (§4.2). */
  public async findFollowingIds(followerId: string): Promise<string[]> {
    const subscriptions = await this.subscriptionRepository.findByFollower(
      followerId,
    );
    return subscriptions.map((subscription) => subscription.followingId);
  }

  public async countFollowers(followingId: string): Promise<number> {
    return this.subscriptionRepository.countByFollowing(followingId);
  }

  public async subscribe(
    followerId: string,
    followingId: string,
  ): Promise<Subscription> {
    if (followerId === followingId) {
      throw new SelfSubscriptionError();
    }

    const existing = await this.subscriptionRepository.findByFollowerAndFollowing(
      followerId,
      followingId,
    );
    if (existing) {
      throw new SubscriptionAlreadyExistsError(followingId);
    }

    return this.subscriptionRepository.save(followerId, followingId);
  }

  public async unsubscribe(
    followerId: string,
    followingId: string,
  ): Promise<void> {
    const existing = await this.subscriptionRepository.findByFollowerAndFollowing(
      followerId,
      followingId,
    );
    if (!existing) {
      throw new SubscriptionNotFoundError(followingId);
    }

    await this.subscriptionRepository.deleteByFollowerAndFollowing(
      followerId,
      followingId,
    );
  }
}
