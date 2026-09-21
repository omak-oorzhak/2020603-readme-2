import { Module } from '@nestjs/common';
import { LikeController } from './like.controller';
import { LikeService } from './like.service';
import { LikeRepository } from './like.repository';
import { PostModule } from '../post/post.module';

@Module({
  imports: [PostModule], // LikeService проверяет публикацию через PostService
  controllers: [LikeController],
  providers: [LikeService, LikeRepository],
})
export class LikeModule {}
