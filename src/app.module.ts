import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ProjectModule } from './projects/projects.module';
import { MembershipsModule } from './memberships/memberships.module';
import { TasksModule } from './tasks/tasks.module';
import { InvitationsModule } from './invitations/invitations.module';
import { QueuesModule } from './queues/queues.module';
import { InboxModule } from './inbox/inbox.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [PrismaModule, AuthModule, ProjectModule, MembershipsModule, TasksModule, InvitationsModule, QueuesModule, InboxModule, NotificationsModule, AuditModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
