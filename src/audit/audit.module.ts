import { Module, forwardRef } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { MembershipsModule } from "src/memberships/memberships.module";

@Module({
  imports: [PrismaModule, forwardRef(() => MembershipsModule)],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}

