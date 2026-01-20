import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { QueuesService } from "@/queues/queues.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksResponseDto } from "./dto/tasks-response.dto";
import { AuditService } from "@/audit/audit.service";

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queuesService: QueuesService,
    private readonly auditService: AuditService
  ) {}

  private toResponseDto(task: {
    id: string;
    title: string;
    description: string | null;
    deadline: Date | null;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): TasksResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      completed: task.completed,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async findAll(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    return tasks.map((task) => this.toResponseDto(task));
  }

  async create(projectId: string, createTaskDto: CreateTaskDto, userId: string) {
    const task = await this.prisma.task.create({
      data: { ...createTaskDto, projectId },
      include: {
        project: true,
      },
    });

    // Логируем создание задачи
    await this.auditService.logCreate(
      "Task",
      task.id,
      userId,
      {
        id: task.id,
        title: task.title,
        description: task.description,
        deadline: task.deadline?.toISOString() || null,
        completed: task.completed,
      },
      projectId,
      task.id
    );

    // Если задан deadline, планируем напоминание
    if (task.deadline) {
      await this.queuesService.scheduleDeadlineReminder(
        task.id,
        task.title,
        task.project.name,
        task.deadline
      );
    }

    return this.toResponseDto(task);
  }

  async update(taskId: string, updateTaskDto: UpdateTaskDto, userId: string) {
    // Получаем текущую задачу для проверки изменения deadline
    const currentTask = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!currentTask) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updateTaskDto,
      include: {
        project: true,
      },
    });

    // Проверяем изменения для логирования
    const statusChanged =
      updateTaskDto.completed !== undefined &&
      updateTaskDto.completed !== currentTask.completed;

    const deadlineChanged =
      updateTaskDto.deadline !== undefined &&
      (updateTaskDto.deadline?.getTime() !== currentTask.deadline?.getTime() ||
        (updateTaskDto.deadline === null && currentTask.deadline !== null) ||
        (updateTaskDto.deadline !== null && currentTask.deadline === null));

    // Логируем изменение статуса отдельно
    if (statusChanged) {
      await this.auditService.logStatusChanged(
        taskId,
        userId,
        currentTask.projectId,
        currentTask.completed,
        task.completed
      );
    }

    // Логируем изменение дедлайна отдельно
    if (deadlineChanged) {
      await this.auditService.logDeadlineChanged(
        taskId,
        userId,
        currentTask.projectId,
        currentTask.deadline,
        task.deadline
      );
    }

    // Логируем остальные изменения как UPDATE
    const otherChanges: Record<string, { old: any; new: any }> = {};
    if (updateTaskDto.title !== undefined && updateTaskDto.title !== currentTask.title) {
      otherChanges.title = { old: currentTask.title, new: task.title };
    }
    if (
      updateTaskDto.description !== undefined &&
      updateTaskDto.description !== currentTask.description
    ) {
      otherChanges.description = {
        old: currentTask.description,
        new: task.description,
      };
    }

    if (Object.keys(otherChanges).length > 0) {
      await this.auditService.logUpdate(
        "Task",
        taskId,
        userId,
        otherChanges,
        currentTask.projectId,
        taskId
      );
    }

    // Если deadline изменился, перепланируем напоминание
    if (deadlineChanged) {
      if (task.deadline) {
        // Если новый deadline установлен, планируем напоминание
        await this.queuesService.scheduleDeadlineReminder(
          task.id,
          task.title,
          task.project.name,
          task.deadline
        );
      } else {
        // Если deadline удален, отменяем существующее напоминание
        await this.queuesService.cancelDeadlineReminder(task.id);
      }
    }

    return this.toResponseDto(task);
  }

  async delete(taskId: string, userId: string) {
    // Получаем данные задачи перед удалением для логирования
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const taskData = {
      id: task.id,
      title: task.title,
      description: task.description,
      deadline: task.deadline?.toISOString() || null,
      completed: task.completed,
    };

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    // Логируем удаление задачи
    await this.auditService.logDelete(
      "Task",
      taskId,
      userId,
      taskData,
      task.projectId,
      taskId
    );
  }
}
