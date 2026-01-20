import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Body } from "@nestjs/common";
import { ProjectService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { JwtUserDto } from "@/auth/dto/jwt-user.dto";
import { ProjectsResponseDto } from "./dto/projects-response.dto";
import { RequireRole } from "@/memberships/guards/require-role.decorator";
import { MembershipRole } from "@prisma/client";
import { MembershipsGuard } from "@/memberships/guards/memberships.guard";
import { ProjectResponseDto } from "./dto/project-response.dto";

@ApiTags("projects")
@ApiBearerAuth()
@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  @ApiOperation({ summary: "Создать проект" })
  @ApiResponse({
    status: 201,
    description: "Проект создан",
    type: ProjectsResponseDto,
  })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: JwtUserDto
  ) {
    return this.projectService.create(createProjectDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: "Получить все проекты" })
  @ApiResponse({
    status: 200,
    description: "Проекты",
    type: [ProjectsResponseDto],
  })
  findAll(@CurrentUser() user: JwtUserDto): Promise<ProjectsResponseDto[]> {
    return this.projectService.findAll(user.userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить проект по id" })
  @ApiResponse({
    status: 200,
    description: "Проект",
    type: ProjectResponseDto,
  })
  findOne(
    @Param("id") id: string,
    @CurrentUser() user: JwtUserDto
  ): Promise<ProjectResponseDto> {
    return this.projectService.findOne(id, user.userId);
  }

  @UseGuards(MembershipsGuard)
  @RequireRole(MembershipRole.OWNER)
  @Delete(":id")
  @ApiOperation({ summary: "Удалить проект" })
  @ApiResponse({
    status: 200,
    description: "Проект удален",
  })
  @ApiResponse({
    status: 403,
    description: "Доступ запрещен. Требуется роль OWNER",
  })
  @ApiResponse({
    status: 404,
    description: "Проект не найден",
  })
  delete(
    @Param("id") id: string,
    @CurrentUser() user: JwtUserDto
  ): Promise<void> {
    return this.projectService.delete(id, user.userId);
  }
}
