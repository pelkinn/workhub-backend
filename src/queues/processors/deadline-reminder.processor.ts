import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Logger } from "@nestjs/common";
import { TelegramService } from "src/notifications/telegram.service";

interface DeadlineReminderJobData {
  taskId: string;
  taskTitle: string;
  projectName: string;
  deadline: string; // ISO string
}

@Processor("deadline-reminders-queue")
export class DeadlineReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(DeadlineReminderProcessor.name);

  constructor(private readonly telegramService: TelegramService) {
    super();
  }

  async process(job: Job<DeadlineReminderJobData, any, string>): Promise<any> {
    this.logger.log(`Processing deadline reminder job ${job.id}`);

    const { taskTitle, projectName, deadline } = job.data;
    const deadlineDate = new Date(deadline);

    try {
      await this.telegramService.sendDeadlineReminder(
        taskTitle,
        projectName,
        deadlineDate
      );

      this.logger.log(
        `Deadline reminder sent for task "${taskTitle}" in project "${projectName}"`
      );

      return {
        processed: true,
        jobId: job.id,
        taskTitle,
        projectName,
        deadline: deadlineDate.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error processing deadline reminder job ${job.id}:`,
        error
      );
      throw error;
    }
  }
}
