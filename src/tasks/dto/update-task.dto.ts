import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsDate, IsOptional, IsString } from "class-validator";

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: "Заголовок задачи",
    example: "Заголовок задачи",
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: "Описание задачи",
    example: "Описание задачи",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Дедлайн задачи (ISO строка или timestamp в миллисекундах)",
    example: "2026-01-14T06:37:32.031Z",
  })
  @Transform(({ value }) => (value ? new Date(value) : value))
  @IsDate()
  @IsOptional()
  deadline?: Date;

  @ApiPropertyOptional({
    description: "Выполнена ли задача",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  completed?: boolean;
}
