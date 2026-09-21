/**
 * Payload события `post.unpublished`: пост переведён в черновик или удалён.
 * Notify убирает его из очереди рассылки, если он ещё не был разослан.
 */
export interface PostUnpublishedEvent {
  postId: string;
}
