import { Module } from "@nestjs/common";
import { InboxController } from "./inbox.controller";
import { InboxService } from "./inbox.service";
import { PrismaModule } from "@/prisma/prisma.module";
import { TasksModule } from "@/tasks/tasks.module";
import { AuditModule } from "@/audit/audit.module";

@Module({
  imports: [PrismaModule, TasksModule, AuditModule],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}

