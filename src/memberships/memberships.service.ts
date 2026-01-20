import { Injectable, NotFoundException } from "@nestjs/common";
import { MembershipsResponseDto } from "./dto/memberships-response.dto";
import { PrismaService } from "@/prisma/prisma.service";
import { AuditService } from "@/audit/audit.service";
import { MembershipRole } from "@prisma/client";

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async findAll(projectId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { projectId },
      include: {
        user: true,
      },
    });

    return memberships.map((membership) => ({
      id: membership.id,
      userId: membership.userId,
      name: membership.user.name ?? "",
      role: membership.role,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    }));
  }

  async updateRole(
    membershipId: string,
    newRole: MembershipRole,
    userId: string
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException("Membership not found");
    }

    const oldRole = membership.role;

    await this.prisma.membership.update({
      where: { id: membershipId },
      data: { role: newRole },
    });

    // Логируем изменение роли
    await this.auditService.logRoleChanged(
      membershipId,
      userId,
      membership.projectId,
      oldRole,
      newRole
    );
  }

  async remove(membershipId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException("Membership not found");
    }

    const role = membership.role;
    const projectId = membership.projectId;

    await this.prisma.membership.delete({
      where: { id: membershipId },
    });

    // Логируем удаление участника
    await this.auditService.logMemberRemoved(
      membershipId,
      userId,
      projectId,
      role
    );
  }
}
