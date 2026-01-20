import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
} from "@nestjs/common";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationsService } from "./invitations.service";
import {
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/auth/guards/jwt-auth.guard";
import { MembershipRole } from "@prisma/client";
import { RequireRole } from "@/memberships/guards/require-role.decorator";
import { MembershipsGuard } from "@/memberships/guards/memberships.guard";
import { CurrentUser } from "@/auth/decorators/current-user.decorator";
import { JwtUserDto } from "@/auth/dto/jwt-user.dto";
import { InvitationsResponseDto } from "./dto/invitations-response.dto";

@ApiTags("invitations")
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(JwtAuthGuard, MembershipsGuard)
  @RequireRole([MembershipRole.EDITOR, MembershipRole.OWNER])
  @ApiBearerAuth()
  @Post("projects/:projectId/invitations")
  @ApiOperation({ summary: "Создать приглашение в проект" })
  @ApiResponse({
    status: 201,
    description: "Приглашение создано успешно",
  })
  @ApiResponse({
    status: 403,
    description: "Доступ запрещен. Требуется роль EDITOR или OWNER",
  })
  @ApiResponse({
    status: 404,
    description: "Проект не найден",
  })
  createInvitation(
    @Body() createInvitationDto: CreateInvitationDto,
    @Param("projectId") projectId: string,
    @CurrentUser() user: JwtUserDto
  ) {
    return this.invitationsService.createInvitation(
      createInvitationDto,
      projectId,
      user.userId
    );
  }

  @UseGuards(JwtAuthGuard, MembershipsGuard)
  @ApiBearerAuth()
  @Get("projects/:projectId/invitations")
  @ApiOperation({ summary: "Получить все приглашения проекта" })
  @ApiResponse({
    status: 200,
    description: "Список приглашений проекта",
    type: [InvitationsResponseDto],
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
  ): Promise<InvitationsResponseDto[]> {
    return this.invitationsService.findAll(projectId);
  }

  @Get("invitations/:token")
  @ApiOperation({
    summary: "Получить информацию о приглашении по токену",
    description:
      "Публичный эндпоинт для просмотра информации о приглашении. Не требует авторизации.",
  })
  @ApiResponse({
    status: 200,
    description: "Информация о приглашении",
  })
  @ApiResponse({
    status: 404,
    description: "Приглашение не найдено",
  })
  getInvitation(@Param("token") token: string) {
    return this.invitationsService.getInvitation(token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post("invitations/:token/accept")
  @ApiOperation({ summary: "Принять приглашение" })
  @ApiResponse({
    status: 200,
    description: "Приглашение принято успешно",
  })
  @ApiResponse({
    status: 400,
    description: "Email пользователя не совпадает с email в приглашении",
  })
  @ApiResponse({
    status: 404,
    description: "Приглашение не найдено",
  })
  @ApiResponse({
    status: 409,
    description: "Пользователь уже является участником проекта",
  })
  acceptInvitation(
    @Param("token") token: string,
    @CurrentUser() user: JwtUserDto
  ) {
    return this.invitationsService.acceptInvitation(token, user.userId);
  }

  @UseGuards(JwtAuthGuard, MembershipsGuard)
  @RequireRole([MembershipRole.EDITOR, MembershipRole.OWNER])
  @ApiBearerAuth()
  @Delete("projects/:projectId/invitations/:id")
  @ApiOperation({ summary: "Удалить приглашение" })
  @ApiResponse({
    status: 200,
    description: "Приглашение удалено успешно",
  })
  @ApiResponse({
    status: 403,
    description: "Доступ запрещен. Требуется роль EDITOR или OWNER",
  })
  @ApiResponse({
    status: 404,
    description: "Приглашение не найдено",
  })
  delete(
    @Param("id") id: string,
    @Param("projectId") projectId: string
  ): Promise<void> {
    return this.invitationsService.delete(id, projectId);
  }
}
