import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuditService } from "./audit.service";
import { AuditLogResponseDto } from "./dto/audit-log-response.dto";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { MembershipsGuard } from "src/memberships/guards/memberships.guard";

@ApiTags("audit")
@ApiBearerAuth()
@Controller("projects/:projectId/audit-logs")
@UseGuards(JwtAuthGuard, MembershipsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Получить все логи аудита проекта" })
  @ApiResponse({
    status: 200,
    description: "Логи аудита проекта",
    type: [AuditLogResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: "Проект не найден",
  })
  @ApiResponse({
    status: 403,
    description: "Доступ запрещен. Вы не являетесь участником проекта",
  })
  findAll(@Param("projectId") projectId: string): Promise<AuditLogResponseDto[]> {
    return this.auditService.findByProjectId(projectId);
  }
}

