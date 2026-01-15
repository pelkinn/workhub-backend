import { IsEmail, IsEnum } from "class-validator";
import { MembershipRole } from "@prisma/client";

const INVITATION_ROLES = ["EDITOR", "VIEWER"] as const;
const INVITATION_ROLES_VALUES = INVITATION_ROLES.join(", ");

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsEnum(INVITATION_ROLES, {
    message: `Роль должна быть одной из: ${INVITATION_ROLES_VALUES}`,
  })
  role!: MembershipRole;
}
