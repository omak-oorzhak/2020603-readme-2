import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PostRdo } from './post.rdo';
import { UserInfoRdo } from '../../common/rdo/user-info.rdo';

export class PostWithAuthorRdo extends PostRdo {
  @ApiProperty({
    description:
      'Автор публикации (null, если данные автора не удалось получить из сервиса users)',
    type: () => UserInfoRdo,
    required: false,
    nullable: true,
  })
  @Expose()
  @Type(() => UserInfoRdo)
  public author!: UserInfoRdo | null;
}
