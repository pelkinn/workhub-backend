import { SetMetadata } from "@nestjs/common";
import { MembershipRole } from "@prisma/client";

export const REQUIRE_ROLE_KEY = "requireRole";

export const RequireRole = (role: MembershipRole) =>
  SetMetadata(REQUIRE_ROLE_KEY, role);
