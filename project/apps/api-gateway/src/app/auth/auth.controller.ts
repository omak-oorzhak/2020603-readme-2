import {
  Body,
  Controller,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UserRdo } from './rdo/user.rdo';
import { LoggedUserRdo } from './rdo/logged-user.rdo';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { AnonymousGuard } from '../common/anonymous.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AVATAR_MAX_FILE_SIZE, IMAGE_MIME_TYPE_PATTERN } from '../common/upload.constant';

const registerBodySchema = {
  schema: {
    type: 'object',
    required: ['email', 'name', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      name: { type: 'string', example: 'Иван Иванов' },
      password: { type: 'string', example: 'secret123' },
      avatar: { type: 'string', format: 'binary' },
    },
  },
};

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(AnonymousGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiOperation({ summary: 'Регистрация нового пользователя (с опциональным аватаром)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody(registerBodySchema)
  @ApiCreatedResponse({ description: 'Пользователь успешно создан', type: UserRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные регистрации или файла' })
  @ApiConflictResponse({ description: 'Пользователь с таким email уже существует' })
  @ApiForbiddenResponse({ description: 'Регистрация доступна только анонимным клиентам' })
  public async register(
    @Body() dto: RegisterUserDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: AVATAR_MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: IMAGE_MIME_TYPE_PATTERN }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ): Promise<UserRdo> {
    return this.authService.register(dto, file);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему (получение JWT токенов)' })
  @ApiOkResponse({ description: 'Успешная авторизация', type: LoggedUserRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные авторизации' })
  @ApiUnauthorizedResponse({ description: 'Неверный пароль' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  public async login(@Body() dto: LoginUserDto): Promise<LoggedUserRdo> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обменять refresh-токен на новую пару токенов' })
  @ApiOkResponse({ description: 'Новая пара токенов', type: LoggedUserRdo })
  @ApiBadRequestResponse({ description: 'Невалидный формат токена' })
  @ApiUnauthorizedResponse({ description: 'Refresh-токен недействителен или истёк' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  public async refresh(@Body() dto: RefreshTokenDto): Promise<LoggedUserRdo> {
    return this.authService.refresh(dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Смена пароля текущего пользователя' })
  @ApiOkResponse({ description: 'Пароль успешно изменён', type: UserRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные смены пароля' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация или текущий пароль неверен' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  public async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangeUserPasswordDto,
  ): Promise<UserRdo> {
    return this.authService.changePassword(userId, dto);
  }
}
