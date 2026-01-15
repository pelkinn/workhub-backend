import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterDto {
  @ApiProperty({
    example: "user@example.com",
    description: "Email пользователя",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "password123",
    minLength: 6,
    description: "Пароль пользователя (минимум 6 символов)",
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: "John Doe",
    required: false,
    description: "Имя пользователя (необязательное поле)",
  })
  @IsOptional()
  @IsString()
  name?: string;
}
