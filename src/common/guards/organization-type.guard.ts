import { eq } from 'drizzle-orm';

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { DrizzleService } from '@/common/drizzle/drizzle.service';
import { organizations } from '@/modules/organizations/domain/organizations.schema';

export const REQUIRE_ORG_TYPE = 'requireOrgType';
export function RequireOrgType(type: 'school' | 'company') {
  return function (
    target: any,
    _propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) {
    if (descriptor) {
      Reflect.defineMetadata(REQUIRE_ORG_TYPE, type, descriptor.value);
      return descriptor;
    } else {
      Reflect.defineMetadata(REQUIRE_ORG_TYPE, type, target);
      return target;
    }
  };
}

@Injectable()
export class OrganizationTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private drizzleService: DrizzleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredType = this.reflector.getAllAndOverride<'school' | 'company'>(
      REQUIRE_ORG_TYPE,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.organizationId) {
      throw new ForbiddenException('No organization associated with this user');
    }

    const { db } = this.drizzleService;
    const [org] = await db
      .select({ type: organizations.type })
      .from(organizations)
      .where(eq(organizations.id, user.organizationId));

    if (!org || org.type !== requiredType) {
      throw new ForbiddenException(
        `This endpoint is only available for ${requiredType} organizations`,
      );
    }

    return true;
  }
}
