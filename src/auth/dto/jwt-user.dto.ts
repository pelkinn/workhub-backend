import { ApiProperty } from "@nestjs/swagger";

export class JwtUserDto {
  @ApiProperty({ description: "Идентификатор пользователя из JWT токена" })
  userId!: string;

  @ApiProperty({ description: "Email пользователя" })
  email!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "Имя пользователя",
  })
  name!: string | null;
}
