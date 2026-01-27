import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { MembershipsService } from "./memberships.service";
import { MembershipsResponseDto } from "./dto/memberships-response.dto";
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { MembershipsGuard } from "./guards/memberships.guard";

@ApiTags("memberships")
@ApiBearerAuth()
@Controller("projects/:projectId/memberships")
@UseGuards(JwtAuthGuard, MembershipsGuard)
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @ApiOperation({ summary: "Получить всех участников проекта" })
  @ApiResponse({
    status: 200,
    description: "Участники проекта",
    type: [MembershipsResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: "Доступ запрещен",
  })
  @ApiResponse({
    status: 404,
    description: "Проект не найден",
  })
  findAll(
    @Param("projectId") projectId: string
  ): Promise<MembershipsResponseDto[]> {
    return this.membershipsService.findAll(projectId);
  }
}
