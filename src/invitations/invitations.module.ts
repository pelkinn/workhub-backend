import { Module, forwardRef } from "@nestjs/common";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { PrismaModule } from "src/prisma/prisma.module";
import { MembershipsModule } from "src/memberships/memberships.module";
import { AuditModule } from "src/audit/audit.module";

@Module({
  imports: [PrismaModule, MembershipsModule, AuditModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
