import { IsEmail, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { UserRegisteredEvent } from '@project/shared-types';

/**
 * Payload события `user.registered` от сервиса users. Для notify каждый
 * зарегистрированный пользователь — получатель рассылки (§7.2).
 */
export class UserRegisteredDto implements UserRegisteredEvent {
  @IsUUID()
  public userId!: string;

  @IsEmail()
  public email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  public name!: string;
}
