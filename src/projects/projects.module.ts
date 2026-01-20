import { Module } from "@nestjs/common";
import { ProjectController } from "./projects.controller";
import { ProjectService } from "./projects.service";
import { PrismaModule } from "@/prisma/prisma.module";
import { AuditModule } from "@/audit/audit.module";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
