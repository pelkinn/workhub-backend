import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/prisma/prisma.service";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { TasksResponseDto } from "./dto/tasks-response.dto";

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(projectId: string, createTaskDto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: { ...createTaskDto, projectId },
    });
    return this.toResponseDto(task);
  }

  async update(taskId: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: updateTaskDto,
    });
    return this.toResponseDto(task);
  }

  async delete(taskId: string) {
    await this.prisma.task.delete({
      where: { id: taskId },
    });
  }
}
