import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Environment, validateEnvironment } from '@project/shared-config';

export class EnvironmentVariables {
  @IsEnum(Environment)
  public APPLICATION_NODE_ENV: Environment = Environment.Development;

  // Явный тип `: number` обязателен: под SWC он задаёт design:type = Number,
  // чтобы enableImplicitConversion привёл строку из .env к числу (см. AGENTS.md → Gotchas).
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  @IsInt()
  @Min(0)
  @Max(65535)
  public APPLICATION_PORT: number = 3001;

  @IsString()
  @MinLength(1)
  public POSTGRES_HOST!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  public POSTGRES_PORT!: number;

  @IsString()
  @MinLength(1)
  public POSTGRES_USER!: string;

  @IsString()
  @MinLength(1)
  public POSTGRES_PASSWORD!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  public POSTGRES_DB!: string;

  @IsString()
  @MinLength(32)
  public JWT_ACCESS_TOKEN_SECRET!: string;

  @IsString()
  @MinLength(1)
  public JWT_ACCESS_TOKEN_EXPIRES_IN!: string;

  @IsString()
  @MinLength(32)
  public JWT_REFRESH_TOKEN_SECRET!: string;

  @IsString()
  @MinLength(1)
  public JWT_REFRESH_TOKEN_EXPIRES_IN!: string;

  // RabbitMQ — продюсер события `user.registered` для сервиса notify.
  @IsString()
  @MinLength(1)
  public RABBITMQ_HOST!: string;

  @IsInt()
  @Min(0)
  @Max(65535)
  public RABBITMQ_PORT!: number;

  @IsString()
  @MinLength(1)
  public RABBITMQ_USER!: string;

  @IsString()
  @MinLength(1)
  public RABBITMQ_PASSWORD!: string;

  @IsString()
  @MinLength(1)
  public RABBITMQ_QUEUE!: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  return validateEnvironment(EnvironmentVariables, config);
}
