import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

interface ReminderJobData {
  reminderHours?: number; // За сколько часов до дедлайна отправлять напоминание (по умолчанию 24)
}

@Processor("reminders-queue")
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ReminderProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<ReminderJobData, any, string>): Promise<any> {
    this.logger.log(`Processing reminder job ${job.id}`);

    const reminderHours = job.data?.reminderHours || 24;
    const now = new Date();
    const reminderThreshold = new Date(
      now.getTime() + reminderHours * 60 * 60 * 1000
    );

    try {
      // Находим задачи с дедлайнами, которые:
      // 1. Еще не выполнены
      // 2. Имеют дедлайн
      // 3. Дедлайн в пределах reminderHours от текущего времени
      // 4. Дедлайн еще не прошел
      const tasksWithDeadlines = await this.prisma.task.findMany({
        where: {
          completed: false,
          deadline: {
            not: null,
            gte: now, // Дедлайн еще не прошел
            lte: reminderThreshold, // Дедлайн в пределах reminderHours
          },
        },
        include: {
          project: {
            include: {
              memberships: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(
        `Found ${tasksWithDeadlines.length} tasks with approaching deadlines`
      );

      const reminders = [];

      for (const task of tasksWithDeadlines) {
        const deadline = task.deadline!;
        const hoursUntilDeadline = Math.floor(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        );

        // Получаем всех участников проекта (кроме задач, которые уже просрочены)
        const projectMembers = task.project.memberships.map((membership) => ({
          userId: membership.userId,
          userEmail: membership.user.email,
          userName: membership.user.name || membership.user.email,
          role: membership.role,
        }));

        for (const member of projectMembers) {
          const reminder = {
            taskId: task.id,
            taskTitle: task.title,
            projectId: task.projectId,
            projectName: task.project.name,
            deadline: deadline,
            hoursUntilDeadline: hoursUntilDeadline,
            userId: member.userId,
            userEmail: member.userEmail,
            userName: member.userName,
          };

          reminders.push(reminder);

          // Логируем напоминание (в будущем здесь будет отправка email/telegram)
          this.logger.log(
            `Reminder for user ${member.userEmail}: Task "${task.title}" in project "${task.project.name}" ` +
              `has deadline in ${hoursUntilDeadline} hours (${deadline.toISOString()})`
          );
        }
      }

      const result = {
        processed: true,
        jobId: job.id,
        reminderHours: reminderHours,
        tasksFound: tasksWithDeadlines.length,
        remindersSent: reminders.length,
        reminders: reminders,
        timestamp: new Date().toISOString(),
      };

      this.logger.log(
        `Reminder job ${job.id} completed: ${reminders.length} reminders for ${tasksWithDeadlines.length} tasks`
      );

      return result;
    } catch (error) {
      this.logger.error(`Error processing reminder job ${job.id}:`, error);
      throw error;
    }
  }
}
