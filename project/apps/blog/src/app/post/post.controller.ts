import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  fillRdo,
  fillRdoList,
  fillRdoPagination,
} from '@project/shared-helpers';
import { PostService } from './post.service.js';
import { CreateVideoPostDto } from './dto/create-video-post.dto';
import { CreateTextPostDto } from './dto/create-text-post.dto';
import { CreateQuotePostDto } from './dto/create-quote-post.dto';
import { CreatePhotoPostDto } from './dto/create-photo-post.dto';
import { CreateLinkPostDto } from './dto/create-link-post.dto';
import { GetPostQueryDto } from './dto/get-post-query.dto';
import { SearchPostQueryDto } from './dto/search-post-query.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostRdo } from './rdo/post.rdo';
import { ApiPaginatedResponse } from '../common/api-paginated-response.decorator';
import { CurrentUserId } from '../common/current-user-id.decorator';
import { RequireUserId } from '../common/require-user-id.decorator';

@ApiTags('posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  @ApiOperation({ summary: 'Получить список публикаций' })
  @ApiPaginatedResponse(PostRdo, 'Список опубликованных публикаций')
  public async index(@Query() query: GetPostQueryDto) {
    const posts = await this.postService.findAll(query);
    return fillRdoPagination(PostRdo, posts);
  }

  @Get('feed')
  @RequireUserId()
  @ApiOperation({ summary: 'Получить ленту текущего пользователя' })
  @ApiPaginatedResponse(PostRdo, 'Постраничная лента текущего пользователя')
  public async feed(
    @CurrentUserId() userId: string,
    @Query() query: GetPostQueryDto,
  ) {
    const posts = await this.postService.findFeed(userId, query);
    return fillRdoPagination(PostRdo, posts);
  }

  @Get('drafts')
  @RequireUserId()
  @ApiOperation({ summary: 'Получить черновики текущего пользователя' })
  @ApiPaginatedResponse(PostRdo, 'Постраничный список черновиков текущего пользователя')
  public async drafts(
    @CurrentUserId() userId: string,
    @Query() query: GetPostQueryDto,
  ) {
    const posts = await this.postService.findDrafts(userId, query);
    return fillRdoPagination(PostRdo, posts);
  }

  @Get('search')
  @ApiOperation({ summary: 'Поиск публикаций по заголовку' })
  @ApiQuery({ name: 'title', description: 'Строка для поиска' })
  @ApiOkResponse({ description: 'Результаты поиска', type: [PostRdo] })
  @ApiBadRequestResponse({ description: 'Невалидные параметры поиска' })
  public async search(@Query() query: SearchPostQueryDto) {
    const posts = await this.postService.search(query.title);
    return fillRdoList(PostRdo, posts);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить публикацию по ID' })
  @ApiParam({ name: 'id', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiOkResponse({ description: 'Публикация найдена', type: PostRdo })
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  public async show(
    @Param('id') id: string,
    @CurrentUserId() requesterId?: string,
  ) {
    const post = await this.postService.findPost(id, requesterId);
    return fillRdo(PostRdo, post);
  }

  @Post('video')
  @RequireUserId()
  @ApiOperation({ summary: 'Создать публикацию типа «Видео»' })
  @ApiCreatedResponse({ description: 'Публикация создана', type: PostRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные публикации' })
  public async createVideo(
    @CurrentUserId() userId: string,
    @Body() dto: CreateVideoPostDto,
  ) {
    const post = await this.postService.createPost(dto, userId);
    return fillRdo(PostRdo, post);
  }

  @Post('text')
  @RequireUserId()
  @ApiOperation({ summary: 'Создать публикацию типа «Текст»' })
  @ApiCreatedResponse({ description: 'Публикация создана', type: PostRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные публикации' })
  public async createText(
    @CurrentUserId() userId: string,
    @Body() dto: CreateTextPostDto,
  ) {
    const post = await this.postService.createPost(dto, userId);
    return fillRdo(PostRdo, post);
  }

  @Post('quote')
  @RequireUserId()
  @ApiOperation({ summary: 'Создать публикацию типа «Цитата»' })
  @ApiCreatedResponse({ description: 'Публикация создана', type: PostRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные публикации' })
  public async createQuote(
    @CurrentUserId() userId: string,
    @Body() dto: CreateQuotePostDto,
  ) {
    const post = await this.postService.createPost(dto, userId);
    return fillRdo(PostRdo, post);
  }

  @Post('photo')
  @RequireUserId()
  @ApiOperation({ summary: 'Создать публикацию типа «Фото»' })
  @ApiCreatedResponse({ description: 'Публикация создана', type: PostRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные публикации' })
  public async createPhoto(
    @CurrentUserId() userId: string,
    @Body() dto: CreatePhotoPostDto,
  ) {
    const post = await this.postService.createPost(dto, userId);
    return fillRdo(PostRdo, post);
  }

  @Post('link')
  @RequireUserId()
  @ApiOperation({ summary: 'Создать публикацию типа «Ссылка»' })
  @ApiCreatedResponse({ description: 'Публикация создана', type: PostRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные публикации' })
  public async createLink(
    @CurrentUserId() userId: string,
    @Body() dto: CreateLinkPostDto,
  ) {
    const post = await this.postService.createPost(dto, userId);
    return fillRdo(PostRdo, post);
  }

  @Patch(':id')
  @RequireUserId()
  @ApiOperation({ summary: 'Обновить публикацию' })
  @ApiParam({ name: 'id', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiOkResponse({ description: 'Публикация обновлена', type: PostRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные публикации' })
  @ApiForbiddenResponse({ description: 'Редактировать можно только свои публикации' })
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  public async update(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdatePostDto,
  ) {
    const post = await this.postService.updatePost(id, dto, userId);
    return fillRdo(PostRdo, post);
  }

  @Delete(':id')
  @RequireUserId()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить публикацию' })
  @ApiParam({ name: 'id', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Публикация удалена' })
  @ApiForbiddenResponse({ description: 'Удалять можно только свои публикации' })
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  public async destroy(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    await this.postService.deletePost(id, userId);
  }

  @Post(':id/repost')
  @RequireUserId()
  @ApiOperation({ summary: 'Репостнуть публикацию' })
  @ApiParam({ name: 'id', description: 'Идентификатор публикации', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Репост создан', type: PostRdo })
  @ApiNotFoundResponse({ description: 'Публикация не найдена' })
  @ApiConflictResponse({ description: 'Репост уже был сделан ранее или это своя публикация' })
  public async repost(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    const post = await this.postService.repost(id, userId);
    return fillRdo(PostRdo, post);
  }
}
