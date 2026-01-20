import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { AuditLogAction, MembershipRole } from "@prisma/client";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logCreate(
    entityType: "User" | "Project" | "Task",
    entityId: string,
    userId: string,
    data: object,
    projectId?: string,
    taskId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.CREATE,
        data: { entity: data },
        userId,
        projectId,
        taskId,
      },
    });
  }

  async logUpdate(
    entityType: "User" | "Project" | "Task",
    entityId: string,
    userId: string,
    changes: object,
    projectId?: string,
    taskId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.UPDATE,
        data: { changes },
        userId,
        projectId,
        taskId,
      },
    });
  }

  async logDelete(
    entityType: "User" | "Project" | "Task",
    entityId: string,
    userId: string,
    data: object,
    projectId?: string,
    taskId?: string
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.DELETE,
        data: { entity: data },
        userId,
        projectId,
        taskId,
      },
    });
  }

  async logInviteCreated(
    invitationId: string,
    userId: string,
    projectId: string,
    email: string,
    role: MembershipRole
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.INVITE_CREATED,
        data: {
          invitationId,
          projectId,
          email,
          role,
        },
        userId,
        projectId,
      },
    });
  }

  async logInviteAccepted(
    invitationId: string,
    userId: string,
    projectId: string,
    role: MembershipRole
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.INVITE_ACCEPTED,
        data: {
          invitationId,
          userId,
          projectId,
          role,
        },
        userId,
        projectId,
      },
    });
  }

  async logRoleChanged(
    membershipId: string,
    userId: string,
    projectId: string,
    oldRole: MembershipRole,
    newRole: MembershipRole
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.ROLE_CHANGED,
        data: {
          membershipId,
          userId,
          projectId,
          oldRole,
          newRole,
        },
        userId,
        projectId,
        membershipId,
      },
    });
  }

  async logMemberRemoved(
    membershipId: string,
    userId: string,
    projectId: string,
    role: MembershipRole
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.MEMBER_REMOVED,
        data: {
          membershipId,
          userId,
          projectId,
          role,
        },
        userId,
        projectId,
        membershipId,
      },
    });
  }

  async logStatusChanged(
    taskId: string,
    userId: string,
    projectId: string,
    oldStatus: boolean,
    newStatus: boolean
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.STATUS_CHANGED,
        data: {
          taskId,
          oldStatus,
          newStatus,
        },
        userId,
        projectId,
        taskId,
      },
    });
  }

  async logDeadlineChanged(
    taskId: string,
    userId: string,
    projectId: string,
    oldDeadline: Date | null,
    newDeadline: Date | null
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.DEADLINE_CHANGED,
        data: {
          taskId,
          oldDeadline: oldDeadline?.toISOString() || null,
          newDeadline: newDeadline?.toISOString() || null,
        },
        userId,
        projectId,
        taskId,
      },
    });
  }

  async logTaskCreatedViaTelegram(
    taskId: string,
    userId: string,
    projectId: string,
    taskData: object
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.TASK_CREATED_VIA_TELEGRAM,
        data: {
          task: taskData,
          source: "telegram",
        },
        userId,
        projectId,
        taskId,
      },
    });
  }

  async logTaskCreatedViaWebhook(
    taskId: string,
    userId: string,
    projectId: string,
    taskData: object
  ) {
    await this.prisma.auditLog.create({
      data: {
        action: AuditLogAction.TASK_CREATED_VIA_WEBHOOK,
        data: {
          task: taskData,
          source: "webhook",
        },
        userId,
        projectId,
        taskId,
      },
    });
  }
}

