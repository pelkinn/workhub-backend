import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { TelegramService } from "src/notifications/telegram.service";

@Processor("daily-digest-queue")
export class DailyDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DailyDigestProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing daily digest job ${job.id}`);

    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      const tomorrowEnd = new Date(tomorrowStart);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Задачи с дедлайном сегодня (не выполненные)
      const todayTasks = await this.prisma.task.findMany({
        where: {
          completed: false,
          deadline: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          project: true,
        },
      });

      // Задачи с дедлайном завтра (не выполненные)
      const tomorrowTasks = await this.prisma.task.findMany({
        where: {
          completed: false,
          deadline: {
            gte: tomorrowStart,
            lte: tomorrowEnd,
          },
        },
        include: {
          project: true,
        },
      });

      // Просроченные задачи (deadline < сегодня, не выполненные)
      const overdueTasks = await this.prisma.task.findMany({
        where: {
          completed: false,
          deadline: {
            lt: todayStart,
          },
        },
        include: {
          project: true,
        },
      });

      const tomorrowTasksFormatted = tomorrowTasks.map((task) => ({
        title: task.title,
        projectName: task.project.name,
        deadline: task.deadline!,
      }));

      await this.telegramService.sendDailyDigest(
        todayTasks.length,
        overdueTasks.length,
        tomorrowTasksFormatted
      );

      this.logger.log(
        `Daily digest sent: Today: ${todayTasks.length}, Overdue: ${overdueTasks.length}, Tomorrow: ${tomorrowTasks.length}`
      );

      return {
        processed: true,
        jobId: job.id,
        todayCount: todayTasks.length,
        overdueCount: overdueTasks.length,
        tomorrowCount: tomorrowTasks.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Error processing daily digest job ${job.id}:`, error);
      throw error;
    }
  }
}
