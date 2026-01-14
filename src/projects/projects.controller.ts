import { Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Body } from "@nestjs/common";
import { ProjectService } from "./projects.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { JwtUserDto } from "@/auth/dto/jwt-user.dto";
import { ProjectsResponseDto } from "./dto/projects-response.dto";

@ApiTags("projects")
@Controller("projects")
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: JwtUserDto
  ) {
    return this.projectService.create(createProjectDto, user.userId);
  }

  @Get()
  findAll(@CurrentUser() user: JwtUserDto): Promise<ProjectsResponseDto[]> {
    return this.projectService.findAll(user.userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: JwtUserDto) {
    return this.projectService.findOne(id, user.userId);
  }
}
