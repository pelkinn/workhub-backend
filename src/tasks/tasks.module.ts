import { Module } from "@nestjs/common";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { QueuesModule } from "src/queues/queues.module";
import { PrismaModule } from "src/prisma/prisma.module";
import { AuditModule } from "src/audit/audit.module";

@Module({
  imports: [QueuesModule, PrismaModule, AuditModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
