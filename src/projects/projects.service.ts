import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateProjectDto } from "./dto/create-project.dto";
import { PrismaService } from "../prisma/prisma.service";
import { MembershipRole } from "@prisma/client";
import { ProjectsResponseDto } from "./dto/projects-response.dto";

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
      include: { memberships: true },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return project;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }
}
