/**
 * Payload события `user.registered`: данные нового пользователя, которые
 * сервис users публикует при регистрации. Notify заносит пользователя в
 * получатели рассылки (§7.2).
 */
export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
}
