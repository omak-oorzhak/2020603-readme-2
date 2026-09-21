import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticationService } from './authentication.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoggedUserRdo } from './rdo/logged-user.rdo';
import { UserService } from '../user/user.service';
import { UserIdParamDto } from '../user/dto/user-id-param.dto';
import { UserRdo } from '../user/rdo/user.rdo';

@ApiTags('authentication')
@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiCreatedResponse({
    description: 'Пользователь успешно создан',
    type: UserRdo,
  })
  @ApiBadRequestResponse({ description: 'Невалидные данные регистрации' })
  @ApiConflictResponse({
    description: 'Пользователь с таким email уже существует',
  })
  public async register(@Body() dto: CreateUserDto): Promise<UserRdo> {
    const user = await this.authenticationService.register(dto);
    return plainToInstance(UserRdo, user, { excludeExtraneousValues: true });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему (получение JWT токенов)' })
  @ApiOkResponse({ description: 'Успешная авторизация', type: LoggedUserRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные авторизации' })
  @ApiUnauthorizedResponse({ description: 'Неверный пароль' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  public async login(@Body() dto: LoginUserDto): Promise<LoggedUserRdo> {
    const user = await this.authenticationService.verifyUser(dto);
    const tokens = await this.authenticationService.createTokens(user);

    return {
      id: user.id,
      email: user.email,
      ...tokens,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обменять refresh-токен на новую пару токенов' })
  @ApiOkResponse({ description: 'Новая пара токенов', type: LoggedUserRdo })
  @ApiBadRequestResponse({ description: 'Невалидный формат токена' })
  @ApiUnauthorizedResponse({ description: 'Refresh-токен недействителен или истёк' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  public async refresh(@Body() dto: RefreshTokenDto): Promise<LoggedUserRdo> {
    const user = await this.authenticationService.verifyRefreshToken(
      dto.refreshToken,
    );
    const tokens = await this.authenticationService.createTokens(user);

    return {
      id: user.id,
      email: user.email,
      ...tokens,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о пользователе' })
  @ApiParam({
    name: 'id',
    description: 'Идентификатор пользователя',
    example: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'Информация о пользователе', type: UserRdo })
  @ApiBadRequestResponse({
    description: 'Невалидный идентификатор пользователя',
  })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  public async show(@Param() params: UserIdParamDto): Promise<UserRdo> {
    const user = await this.userService.getById(params.id);
    return plainToInstance(UserRdo, user, { excludeExtraneousValues: true });
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Смена пароля пользователя' })
  @ApiParam({
    name: 'id',
    description: 'Идентификатор пользователя',
    example: '2f4b7d3a-3c1b-4c4d-8b6a-8ef7b92f1011',
    format: 'uuid',
  })
  @ApiOkResponse({ description: 'Пароль успешно изменён', type: UserRdo })
  @ApiBadRequestResponse({ description: 'Невалидные данные смены пароля' })
  @ApiUnauthorizedResponse({ description: 'Текущий пароль неверен' })
  @ApiNotFoundResponse({ description: 'Пользователь не найден' })
  public async changePassword(
    @Param() params: UserIdParamDto,
    @Body() dto: ChangeUserPasswordDto,
  ): Promise<UserRdo> {
    const user = await this.authenticationService.changePassword(
      params.id,
      dto,
    );
    return plainToInstance(UserRdo, user, { excludeExtraneousValues: true });
  }
}
