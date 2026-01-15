import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateProjectDto } from "./dto/create-project.dto";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipRole } from "@prisma/client";
import { ProjectsResponseDto } from "./dto/projects-response.dto";
import { UserResponseDto } from "@/auth/dto/user-response.dto";

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        ...createProjectDto,
        memberships: {
          create: {
            user: {
              connect: {
                id: userId,
              },
            },
            role: MembershipRole.OWNER,
          },
        },
      },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
        tasks: true,
      },
    });

    return project;
  }

  async findAll(userId: string): Promise<ProjectsResponseDto[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        memberships: {
          some: { userId },
        },
      },
      include: {
        memberships: {
          include: {
            user: true,
          },
        },
        tasks: true,
      },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      membersCount: project.memberships.filter(
        (membership) => membership.role !== MembershipRole.VIEWER
      ).length,
      tasksCount: project.tasks.length,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    }));
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id,
        memberships: {
          some: {
            userId,
            role: {
              in: [
                MembershipRole.OWNER,
                MembershipRole.EDITOR,
                MembershipRole.VIEWER,
              ],
            },
          },
        },
      },
      include: { memberships: { include: { user: true } } },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const ownerMembership = project.memberships.find(
      (membership) => membership.role === MembershipRole.OWNER
    );

    if (!ownerMembership) {
      throw new NotFoundException("Project owner not found");
    }

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      owner: {
        id: ownerMembership.user.id,
        email: ownerMembership.user.email,
        name: ownerMembership.user.name,
      },
    };
  }

  async delete(id: string): Promise<void> {
    // Проверяем существование проекта перед удалением
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException("Проект не найден");
    }

    // Удаляем проект и все связанные данные в транзакции
    // Порядок важен из-за внешних ключей
    await this.prisma.$transaction(async (tx) => {
      // Удаляем audit logs, связанные с задачами проекта
      const tasks = await tx.task.findMany({
        where: { projectId: id },
        select: { id: true },
      });

      const taskIds = tasks.map((task) => task.id);

      if (taskIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: { taskId: { in: taskIds } },
        });
      }

      // Удаляем audit logs, связанные с проектом
      await tx.auditLog.deleteMany({
        where: { projectId: id },
      });

      // Удаляем задачи
      await tx.task.deleteMany({
        where: { projectId: id },
      });

      // Удаляем приглашения
      await tx.invitation.deleteMany({
        where: { projectId: id },
      });

      // Удаляем членства
      await tx.membership.deleteMany({
        where: { projectId: id },
      });

      // Удаляем сам проект
      await tx.project.delete({
        where: { id },
      });
    });
  }
}
