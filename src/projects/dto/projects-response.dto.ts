import { ApiProperty } from "@nestjs/swagger";

export class ProjectsResponseDto {
  @ApiProperty({ description: "ID проекта", example: "1" })
  id!: string;

  @ApiProperty({ description: "Название проекта", example: "Проект 1" })
  name!: string;

  @ApiProperty({ description: "Описание проекта", example: "Описание проекта" })
  description!: string;

  @ApiProperty({
    description: "Участники проекта",
    example: 10,
  })
  membersCount!: number;

  @ApiProperty({
    description: "Дата создания проекта",
    example: "2026-01-14T06:37:32.031Z",
  })
  createdAt!: Date;

  @ApiProperty({
    description: "Задачи проекта",
    example: 10,
  })
  tasksCount!: number;

  @ApiProperty({
    description: "Дата обновления проекта",
    example: "2026-01-14T06:37:32.031Z",
  })
  updatedAt!: Date;
}
