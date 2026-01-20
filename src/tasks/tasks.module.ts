import { Module } from "@nestjs/common";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { QueuesModule } from "@/queues/queues.module";
import { PrismaModule } from "@/prisma/prisma.module";
import { AuditModule } from "@/audit/audit.module";

@Module({
  imports: [QueuesModule, PrismaModule, AuditModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
