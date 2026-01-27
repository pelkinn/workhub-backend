import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { ProjectModule } from "src/projects/projects.module";

@Module({
  imports: [PrismaModule, ProjectModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class NotificationsModule {}
