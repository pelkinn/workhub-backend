import { ApiProperty } from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";

export class InvitationsResponseDto {
  @ApiProperty({ description: "ID приглашения", example: "clx1234567890" })
  id!: string;

  @ApiProperty({
    description: "Email приглашаемого пользователя",
    example: "user@example.com",
  })
  email!: string;

  @ApiProperty({
    description: "Роль, которая будет назначена при принятии приглашения",
    example: "EDITOR",
    enum: MembershipRole,
  })
  role!: MembershipRole;

  @ApiProperty({
    description: "Уникальный токен приглашения",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  token!: string;

  @ApiProperty({
    description: "ID проекта",
    example: "clx1234567890",
  })
  projectId!: string;

  @ApiProperty({
    description: "Дата создания приглашения",
    example: "2026-01-14T06:37:32.031Z",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Дата обновления приглашения",
    example: "2026-01-14T06:37:32.031Z",
  })
  updatedAt!: Date;
}

