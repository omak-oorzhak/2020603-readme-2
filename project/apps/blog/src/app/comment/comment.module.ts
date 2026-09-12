import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentService } from './comment.service';
import { CommentRepository } from './comment.repository';
import { PostModule } from '../post/post.module';

@Module({
  imports: [PostModule], // CommentService проверяет публикацию через PostService
  controllers: [CommentController],
  providers: [CommentService, CommentRepository],
  exports: [CommentService, CommentRepository],
})
export class CommentModule {}
