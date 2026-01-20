import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export enum InboxSource {
  TELEGRAM = "telegram",
  GITHUB = "github",
  WEBHOOK = "webhook",
}

export enum InboxEventType {
  TASK_CREATE = "task_create",
}

export class TaskCreateDataDto {
  @ApiProperty({ description: "Название задачи", example: "Новая задача" })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: "Описание задачи", example: "Описание задачи" })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: "ID проекта", example: "clx123..." })
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({
    description: "Дедлайн задачи (ISO строка)",
    example: "2026-01-20T12:00:00.000Z",
  })
  @IsString()
  @IsOptional()
  deadline?: string;
}

export class InboxRequestDto {
  @ApiProperty({
    description: "Источник события",
    enum: InboxSource,
    example: InboxSource.TELEGRAM,
  })
  @IsEnum(InboxSource)
  @IsNotEmpty()
  source!: InboxSource;

  @ApiProperty({
    description: "Тип события",
    enum: InboxEventType,
    example: InboxEventType.TASK_CREATE,
  })
  @IsEnum(InboxEventType)
  @IsNotEmpty()
  type!: InboxEventType;

  @ApiProperty({
    description: "Данные события",
    type: TaskCreateDataDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TaskCreateDataDto)
  data!: TaskCreateDataDto;

  @ApiPropertyOptional({
    description: "ID пользователя, создавшего задачу (для Telegram)",
    example: "clx123...",
  })
  @IsString()
  @IsOptional()
  userId?: string;
}

