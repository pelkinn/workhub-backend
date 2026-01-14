import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
  @ApiProperty({ description: "Название проекта", example: "Проект 1" })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  name!: string;

  @ApiProperty({
    description: "Описание проекта",
    example: "Описание проекта",
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description!: string;
}
