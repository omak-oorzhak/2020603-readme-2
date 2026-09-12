import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { LikesService } from './likes.service';
import { PostIdParamDto } from './dto/post-id-param.dto';
import { LikeRdo } from './rdo/like.rdo';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('likes')
@Controller('posts/:postId/likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Поставить лайк публикации' })
  @ApiParam({ name: 'postId', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Лайк поставлен', type: LikeRdo })
  @ApiConflictResponse({ description: 'Лайк уже поставлен' })
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  public async addLike(
    @Param() params: PostIdParamDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.likesService.addLike(userId, params.postId);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Убрать лайк с публикации' })
  @ApiParam({ name: 'postId', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Лайк убран' })
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  public async removeLike(
    @Param() params: PostIdParamDto,
    @CurrentUser('sub') userId: string,
  ) {
    await this.likesService.removeLike(userId, params.postId);
  }
}
