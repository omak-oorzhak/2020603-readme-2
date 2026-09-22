import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { UserInfoRdo } from '../../common/rdo/user-info.rdo';

export class CommentWithAuthorRdo {
  @ApiProperty({ description: 'Идентификатор комментария' })
  @Expose()
  public id!: string;

  @ApiProperty({ description: 'Идентификатор публикации' })
  @Expose()
  public postId!: string;

  @ApiProperty({ description: 'Идентификатор автора' })
  @Expose()
  public authorId!: string;

  @ApiProperty({ description: 'Текст комментария' })
  @Expose()
  public text!: string;

  @ApiProperty({ description: 'Дата создания' })
  @Expose()
  public createdAt!: Date;

  @ApiProperty({
    description:
      'Автор комментария (null, если данные автора не удалось получить из сервиса users)',
    type: () => UserInfoRdo,
    required: false,
    nullable: true,
  })
  @Expose()
  @Type(() => UserInfoRdo)
  public author!: UserInfoRdo | null;
}
