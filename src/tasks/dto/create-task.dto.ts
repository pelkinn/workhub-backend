import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDate, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class CreateTaskDto {
  @ApiProperty({ description: "Заголовок задачи", example: "Заголовок задачи" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: "Описание задачи", example: "Описание задачи" })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description: "Дедлайн задачи (ISO строка или timestamp в миллисекундах)",
    example: "2026-01-14T06:37:32.031Z",
  })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  @IsOptional()
  deadline?: Date;
}
