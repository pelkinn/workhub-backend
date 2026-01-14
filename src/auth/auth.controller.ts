import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { UserResponseDto } from "./dto/user-response.dto";
import { JwtUserDto } from "./dto/jwt-user.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { RegisterResponseDto } from "./dto/register-response.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({ summary: "Регистрация нового пользователя" })
  @ApiResponse({
    status: 201,
    description:
      "Пользователь успешно зарегистрирован. Требуется подтверждение email",
    type: RegisterResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Пользователь с таким email уже существует",
  })
  register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Вход пользователя" })
  @ApiResponse({
    status: 200,
    description: "Пользователь успешно вошел в систему",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Неверные учетные данные" })
  login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Получить информацию о текущем пользователе" })
  @ApiResponse({
    status: 200,
    description: "Информация о пользователе",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: "Не авторизован" })
  async getMe(@CurrentUser() user: JwtUserDto): Promise<UserResponseDto> {
    console.log(user);
    return this.authService.getMe(user.userId);
  }
}
