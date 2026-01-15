import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CreateInvitationDto } from "./dto/create-invitation.dto";
import { InvitationsResponseDto } from "./dto/invitations-response.dto";
import { MembershipRole } from "@prisma/client";
import { randomUUID } from "crypto";

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponseDto(invitation: {
    id: string;
    email: string;
    role: MembershipRole;
    token: string;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
  }): InvitationsResponseDto {
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      token: invitation.token,
      projectId: invitation.projectId,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }

  async createInvitation(
    createInvitationDto: CreateInvitationDto,
    projectId: string
  ) {
    const { email, role } = createInvitationDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException("Пользователь с таким email не найден");
    }

    const token = randomUUID();
    const invitation = await this.prisma.invitation.create({
      data: {
        token,
        email,
        role,
        projectId,
      },
      include: {
        project: true,
      },
    });
    return { token };
  }

  async findAll(projectId: string): Promise<InvitationsResponseDto[]> {
    const invitations = await this.prisma.invitation.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((invitation) => this.toResponseDto(invitation));
  }

  async getInvitation(token: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException("Приглашение не найдено");
    }

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    // Найти приглашение по токену
    const invitation = await this.prisma.invitation.findFirst({
      where: { token },
    });

    if (!invitation) {
      throw new NotFoundException("Приглашение не найдено");
    }

    // Получить пользователя
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException("Пользователь не найден");
    }

    // Проверить, что email пользователя совпадает с email в приглашении
    if (user.email !== invitation.email) {
      throw new BadRequestException(
        "Email пользователя не совпадает с email в приглашении"
      );
    }

    // Проверить, что пользователь еще не является участником проекта
    const existingMembership = await this.prisma.membership.findFirst({
      where: {
        projectId: invitation.projectId,
        userId: user.id,
      },
    });

    if (existingMembership) {
      throw new ConflictException(
        "Пользователь уже является участником этого проекта"
      );
    }

    // Создать Membership с ролью из приглашения
    await this.prisma.membership.create({
      data: {
        userId: user.id,
        projectId: invitation.projectId,
        role: invitation.role,
      },
    });

    // Удалить приглашение после принятия
    await this.prisma.invitation.delete({
      where: { id: invitation.id },
    });

    return { success: true, message: "Приглашение принято успешно" };
  }

  async delete(invitationId: string, projectId: string): Promise<void> {
    // Проверить, что приглашение существует и принадлежит проекту
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        projectId,
      },
    });

    if (!invitation) {
      throw new NotFoundException("Приглашение не найдено");
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });
  }
}
