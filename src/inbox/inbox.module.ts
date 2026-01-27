import { Module } from "@nestjs/common";
import { InboxController } from "./inbox.controller";
import { InboxService } from "./inbox.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { TasksModule } from "src/tasks/tasks.module";
import { AuditModule } from "src/audit/audit.module";

@Module({
  imports: [PrismaModule, TasksModule, AuditModule],
  controllers: [InboxController],
  providers: [InboxService],
  exports: [InboxService],
})
export class InboxModule {}

