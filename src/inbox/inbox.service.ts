import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { TasksService } from "@/tasks/tasks.service";
import { InboxRequestDto, InboxEventType, InboxSource } from "./dto/inbox-request.dto";
import { CreateTaskDto } from "@/tasks/dto/create-task.dto";
import { AuditService } from "@/audit/audit.service";
import { MembershipRole } from "@prisma/client";

@Injectable()
export class InboxService {
  private readonly logger = new Logger(InboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly auditService: AuditService
  ) {}

  async processEvent(request: InboxRequestDto) {
    this.logger.log(
      `Processing event: source=${request.source}, type=${request.type}`
    );

    switch (request.type) {
      case InboxEventType.TASK_CREATE:
        return this.handleTaskCreate(request);
      default:
        throw new BadRequestException(
          `Unsupported event type: ${request.type}`
        );
    }
  }

  private async handleTaskCreate(request: InboxRequestDto) {
    const { data, source, userId } = request;

    // Проверяем существование проекта
    const project = await this.prisma.project.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      throw new BadRequestException(`Project with id ${data.projectId} not found`);
    }

    // Определяем userId для логирования
    let auditUserId = userId;
    if (!auditUserId) {
      // Если userId не передан, находим владельца проекта
      const owner = await this.prisma.membership.findFirst({
        where: {
          projectId: data.projectId,
          role: MembershipRole.OWNER,
        },
      });
      auditUserId = owner?.userId || data.projectId; // Fallback на projectId если нет владельца
    }

    // Создаем DTO для задачи
    const createTaskDto: CreateTaskDto = {
      title: data.title,
      description: data.description,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    };

    // Создаем задачу через TasksService
    const task = await this.tasksService.create(data.projectId, createTaskDto, auditUserId);

    // Логируем создание задачи через интеграцию
    const taskData = {
      id: task.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline?.toISOString() || null,
      completed: task.completed,
    };

    if (source === InboxSource.TELEGRAM) {
      await this.auditService.logTaskCreatedViaTelegram(
        task.id,
        auditUserId,
        data.projectId,
        taskData
      );
    } else if (source === InboxSource.WEBHOOK || source === InboxSource.GITHUB) {
      await this.auditService.logTaskCreatedViaWebhook(
        task.id,
        auditUserId,
        data.projectId,
        taskData
      );
    }

    this.logger.log(
      `Task created: id=${task.id}, projectId=${data.projectId}, source=${request.source}`
    );

    return {
      success: true,
      task,
    };
  }
}

