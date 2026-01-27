import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { TasksService } from "./tasks.service";
import { TasksResponseDto } from "./dto/tasks-response.dto";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { MembershipsGuard } from "src/memberships/guards/memberships.guard";
import { RequireRole } from "src/memberships/guards/require-role.decorator";
import { MembershipRole } from "@prisma/client";
import { CurrentUser } from "src/auth/decorators/current-user.decorator";
import { JwtUserDto } from "src/auth/dto/jwt-user.dto";

@ApiTags("tasks")
@ApiBearerAuth()
@Controller("projects/:projectId/tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: "Получить все задачи проекта" })
  @ApiResponse({
    status: 200,
    description: "Задачи проекта",
    type: [TasksResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: "Проект не найден",
  })
  findAll(@Param("projectId") projectId: string): Promise<TasksResponseDto[]> {
    return this.tasksService.findAll(projectId);
  }

  @UseGuards(MembershipsGuard)
  @RequireRole(MembershipRole.EDITOR)
  @Post()
  @ApiOperation({ summary: "Создать задачу в проекте" })
  @ApiResponse({
    status: 201,
    description: "Задача создана",
    type: TasksResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Проект не найден",
  })
  create(
    @Param("projectId") projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: JwtUserDto
  ): Promise<TasksResponseDto> {
    return this.tasksService.create(projectId, createTaskDto, user.userId);
  }

  @UseGuards(MembershipsGuard)
  @RequireRole(MembershipRole.EDITOR)
  @Put(":taskId")
  @ApiOperation({ summary: "Обновить задачу" })
  @ApiResponse({
    status: 200,
    description: "Задача обновлена",
    type: TasksResponseDto,
  })
  update(
    @Param("taskId") taskId: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: JwtUserDto
  ): Promise<TasksResponseDto> {
    return this.tasksService.update(taskId, updateTaskDto, user.userId);
  }

  @UseGuards(MembershipsGuard)
  @RequireRole(MembershipRole.EDITOR)
  @Delete(":taskId")
  @ApiOperation({ summary: "Удалить задачу" })
  @ApiResponse({
    status: 200,
    description: "Задача удалена",
  })
  delete(
    @Param("taskId") taskId: string,
    @CurrentUser() user: JwtUserDto
  ): Promise<void> {
    return this.tasksService.delete(taskId, user.userId);
  }
}
