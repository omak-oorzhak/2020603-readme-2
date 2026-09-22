import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserInfoRdo } from '../../common/rdo/user-info.rdo';

export class SubscriptionWithUserRdo {
  @ApiProperty({ description: 'Идентификатор подписки' })
  @Expose()
  public id!: string;

  @ApiProperty({ description: 'Идентификатор подписчика' })
  @Expose()
  public followerId!: string;

  @ApiProperty({
    description: 'Идентификатор пользователя, на которого подписались',
  })
  @Expose()
  public followingId!: string;

  @ApiProperty({ description: 'Дата создания подписки' })
  @Expose()
  public createdAt!: Date;

  @ApiProperty({
    description:
      'Карточка пользователя, на которого подписаны (null, если его данные не удалось получить из сервиса users)',
    type: () => UserInfoRdo,
    required: false,
    nullable: true,
  })
  @Expose()
  @Type(() => UserInfoRdo)
  public user!: UserInfoRdo | null;
}
