import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostRepository } from './post.repository';
import { NotifyClientModule } from '../notify-client/notify-client.module';
import { SubscriptionModule } from '../subscription/subscription.module';

/** Наружу отдаётся только PostService: репозиторий — внутреннее дело модуля. */
@Module({
  imports: [NotifyClientModule, SubscriptionModule],
  controllers: [PostController],
  providers: [PostService, PostRepository],
  exports: [PostService],
})
export class PostModule {}
