import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { fillRdo, fillRdoPagination } from '@project/shared-helpers';
import { CommentService } from './comment.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { GetCommentQueryDto } from './dto/get-comment-query.dto';
import { CommentRdo } from './rdo/comment.rdo';
import { ApiPaginatedResponse } from '../common/api-paginated-response.decorator';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { RequireUserId } from '../common/require-user-id.decorator';

@ApiTags('comments')
@Controller('posts/:postId/comments')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  @ApiOperation({ summary: 'Получить комментарии к публикации' })
  @ApiParam({ name: 'postId', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiPaginatedResponse(CommentRdo, 'Постраничный список комментариев')
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  public async index(
    @Param('postId') postId: string,
    @Query() query: GetCommentQueryDto,
  ) {
    const comments = await this.commentService.getComments(postId, query);
    return fillRdoPagination(CommentRdo, comments);
  }

  @Post()
  @RequireUserId()
  @ApiOperation({ summary: 'Добавить комментарий к публикации' })
  @ApiParam({ name: 'postId', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Комментарий создан', type: CommentRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные комментария' })
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  public async create(
    @Param('postId') postId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.commentService.createComment(
      postId,
      dto,
      userId,
    );
    return fillRdo(CommentRdo, comment);
  }

  @Delete(':id')
  @RequireUserId()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить комментарий' })
  @ApiParam({ name: 'postId', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiParam({ name: 'id', description: 'Идентификатор комментария', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Комментарий удалён' })
  @ApiForbiddenResponse({ description: 'Удалять можно только свои комментарии' })
  @ApiNotFoundResponse({ description: 'Комментарий не найден' })
  public async destroy(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    await this.commentService.deleteComment(id, userId);
  }
}
