import { ApiProperty } from "@nestjs/swagger";
import { AuditLogAction } from "@prisma/client";
import { UserResponseDto } from "src/auth/dto/user-response.dto";

export class AuditLogResponseDto {
  @ApiProperty({ description: "ID лога аудита", example: "1" })
  id!: string;

  @ApiProperty({
    description: "Действие, которое было выполнено",
    enum: AuditLogAction,
    example: AuditLogAction.CREATE,
  })
  action!: AuditLogAction;

  @ApiProperty({
    description: "Данные действия в формате JSON",
    example: { entity: { id: "1", name: "Проект" } },
  })
  data!: object;

  @ApiProperty({ description: "ID пользователя, выполнившего действие", example: "1" })
  userId!: string;

  @ApiProperty({
    description: "Информация о пользователе",
    type: UserResponseDto,
  })
  user!: UserResponseDto;

  @ApiProperty({
    description: "Дата создания лога",
    example: "2026-01-14T06:37:32.031Z",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Дата обновления лога",
    example: "2026-01-14T06:37:32.031Z",
  })
  updatedAt!: Date;

  @ApiProperty({
    description: "ID проекта",
    example: "1",
    nullable: true,
  })
  projectId!: string | null;

  @ApiProperty({
    description: "ID задачи",
    example: "1",
    nullable: true,
  })
  taskId!: string | null;

  @ApiProperty({
    description: "ID членства",
    example: "1",
    nullable: true,
  })
  membershipId!: string | null;
}

