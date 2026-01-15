import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { ProjectModule } from './projects/projects.module';
import { MembershipsModule } from './memberships/memberships.module';
import { TasksModule } from './tasks/tasks.module';
import { InvitationsModule } from './invitations/invitations.module';

@Module({
  imports: [PrismaModule, AuthModule, ProjectModule, MembershipsModule, TasksModule, InvitationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
