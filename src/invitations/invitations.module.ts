import { Module, forwardRef } from "@nestjs/common";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";
import { PrismaModule } from "@/prisma/prisma.module";
import { MembershipsModule } from "@/memberships/memberships.module";

@Module({
  imports: [PrismaModule, MembershipsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
