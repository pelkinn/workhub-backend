import { Module } from "@nestjs/common";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";
import { PrismaModule } from "@/prisma/prisma.module";
import { MembershipsGuard } from "./guards/memberships.guard";
import { AuditModule } from "@/audit/audit.module";

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsGuard],
  exports: [MembershipsGuard],
})
export class MembershipsModule {}
