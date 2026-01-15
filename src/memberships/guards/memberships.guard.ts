import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { MembershipRole } from "@prisma/client";
import { PrismaService } from "@/prisma/prisma.service";
import { REQUIRE_ROLE_KEY } from "./require-role.decorator";

@Injectable()
export class MembershipsGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Проверяем, что пользователь аутентифицирован
    if (!user || !user.userId) {
      throw new ForbiddenException("Пользователь не аутентифицирован");
    }

    // Получаем projectId из параметров маршрута
    const projectId = request.params.projectId;
    if (!projectId) {
      throw new NotFoundException("Project ID не указан");
    }

    // Проверяем существование проекта
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException("Проект не найден");
    }

    // Проверяем существование membership
    const membership = await this.prisma.membership.findFirst({
      where: {
        projectId,
        userId: user.userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException("Вы не являетесь участником этого проекта");
    }

    // Проверяем роль, если указана через декоратор @RequireRole
    const requiredRole = this.reflector.get<MembershipRole>(
      REQUIRE_ROLE_KEY,
      context.getHandler()
    );

    if (requiredRole) {
      const roleHierarchy: Record<MembershipRole, number> = {
        [MembershipRole.VIEWER]: 1,
        [MembershipRole.EDITOR]: 2,
        [MembershipRole.OWNER]: 3,
      };

      const userRoleLevel = roleHierarchy[membership.role];
      const requiredRoleLevel = roleHierarchy[requiredRole];

      if (userRoleLevel < requiredRoleLevel) {
        throw new ForbiddenException(
          `Требуется роль ${requiredRole}, у вас роль ${membership.role}`
        );
      }
    }

    return true;
  }
}
