import { Module, forwardRef } from "@nestjs/common";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { MembershipsGuard } from "./guards/memberships.guard";
import { AuditModule } from "src/audit/audit.module";

@Module({
  imports: [PrismaModule, forwardRef(() => AuditModule)],
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsGuard],
  exports: [MembershipsGuard],
})
export class MembershipsModule {}
