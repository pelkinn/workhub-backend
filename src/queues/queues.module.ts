import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { TestProcessor } from "./processors/test.processor";
import { ReminderProcessor } from "./processors/reminder.processor";
import { DeadlineReminderProcessor } from "./processors/deadline-reminder.processor";
import { DailyDigestProcessor } from "./processors/daily-digest.processor";
import { QueuesService } from "./queues.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { NotificationsModule } from "src/notifications/notifications.module";

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
      },
    }),
    BullModule.registerQueue({
      name: "test-queue",
    }),
    BullModule.registerQueue({
      name: "reminders-queue",
    }),
    BullModule.registerQueue({
      name: "deadline-reminders-queue",
    }),
    BullModule.registerQueue({
      name: "daily-digest-queue",
    }),
    PrismaModule,
    NotificationsModule,
  ],
  providers: [
    TestProcessor,
    ReminderProcessor,
    DeadlineReminderProcessor,
    DailyDigestProcessor,
    QueuesService,
  ],
  exports: [QueuesService],
})
export class QueuesModule {}
