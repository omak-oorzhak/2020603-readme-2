import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { fillRdo } from '@project/shared-helpers';
import { LikeService } from './like.service.js';
import { LikeRdo } from './rdo/like.rdo';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { RequireUserId } from '../common/require-user-id.decorator';

@ApiTags('likes')
@Controller('posts/:postId/likes')
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post()
  @RequireUserId()
  @ApiOperation({ summary: 'Поставить лайк публикации' })
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Лайк уже поставлен' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Публикация не найдена' })
  public async addLike(
    @Param('postId') postId: string,
    @CurrentUserId() userId: string,
  ) {
    const like = await this.likeService.addLike(postId, userId);
    return fillRdo(LikeRdo, like);
  }

  @Delete()
  @RequireUserId()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Убрать лайк с публикации' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Публикация не найдена' })
  public async removeLike(
    @Param('postId') postId: string,
    @CurrentUserId() userId: string,
  ) {
    await this.likeService.removeLike(postId, userId);
  }
}
