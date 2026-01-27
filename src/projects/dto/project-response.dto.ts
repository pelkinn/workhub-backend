import { UserResponseDto } from "src/auth/dto/user-response.dto";
import { ApiProperty } from "@nestjs/swagger";

export class ProjectResponseDto {
  @ApiProperty({ description: "ID проекта", example: "1" })
  id!: string;

  @ApiProperty({ description: "Название проекта", example: "Проект 1" })
  name!: string;

  @ApiProperty({ description: "Описание проекта", example: "Описание проекта" })
  description!: string;

  @ApiProperty({
    description: "Дата создания проекта",
    example: "2026-01-14T06:37:32.031Z",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Дата обновления проекта",
    example: "2026-01-14T06:37:32.031Z",
  })
  updatedAt!: Date;

  @ApiProperty({ description: "ID владельца проекта", example: "1" })
  owner!: UserResponseDto;
}
