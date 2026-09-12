import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { fillRdo, fillRdoList } from '@project/shared-helpers';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { RequireUserId } from '../common/require-user-id.decorator';
import { FollowersCountParamDto } from './dto/followers-count-param.dto';
import { SubscriptionParamDto } from './dto/subscription-param.dto';
import { FollowersCountRdo } from './rdo/followers-count.rdo';
import { SubscriptionRdo } from './rdo/subscription.rdo';
import { SubscriptionService } from './subscription.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @RequireUserId()
  @ApiOperation({ summary: 'Получить подписки текущего пользователя' })
  @ApiOkResponse({
    description: 'Список подписок текущего пользователя',
    type: [SubscriptionRdo],
  })
  public async index(@CurrentUserId() userId: string) {
    const subscriptions = await this.subscriptionService.findSubscriptions(
      userId,
    );
    return fillRdoList(SubscriptionRdo, subscriptions);
  }

  @Get('followers/:userId/count')
  @ApiOperation({ summary: 'Получить количество подписчиков пользователя' })
  @ApiParam({
    name: 'userId',
    description: 'Идентификатор пользователя, чьих подписчиков считаем',
  })
  @ApiOkResponse({
    description: 'Количество подписчиков пользователя',
    type: FollowersCountRdo,
  })
  @ApiBadRequestResponse({ description: 'Невалидный идентификатор пользователя' })
  public async followersCount(
    @Param() params: FollowersCountParamDto,
  ): Promise<FollowersCountRdo> {
    const count = await this.subscriptionService.countFollowers(params.userId);
    return fillRdo(FollowersCountRdo, { count });
  }

  @Post(':followingId')
  @RequireUserId()
  @ApiOperation({ summary: 'Подписаться на пользователя' })
  @ApiParam({
    name: 'followingId',
    description: 'Идентификатор пользователя, на которого оформляется подписка',
  })
  @ApiCreatedResponse({ description: 'Подписка создана', type: SubscriptionRdo })
  @ApiBadRequestResponse({ description: 'Невалидный идентификатор пользователя' })
  @ApiConflictResponse({ description: 'Подписка уже существует или пользователь подписывается на себя' })
  public async subscribe(
    @CurrentUserId() userId: string,
    @Param() params: SubscriptionParamDto,
  ) {
    const subscription = await this.subscriptionService.subscribe(
      userId,
      params.followingId,
    );
    return fillRdo(SubscriptionRdo, subscription);
  }

  @Delete(':followingId')
  @RequireUserId()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отписаться от пользователя' })
  @ApiParam({
    name: 'followingId',
    description: 'Идентификатор пользователя, от которого нужно отписаться',
  })
  @ApiNoContentResponse({ description: 'Подписка удалена' })
  @ApiBadRequestResponse({ description: 'Невалидный идентификатор пользователя' })
  @ApiNotFoundResponse({ description: 'Подписка не найдена' })
  public async unsubscribe(
    @CurrentUserId() userId: string,
    @Param() params: SubscriptionParamDto,
  ) {
    await this.subscriptionService.unsubscribe(userId, params.followingId);
  }
}
