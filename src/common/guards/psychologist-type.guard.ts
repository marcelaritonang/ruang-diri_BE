import { eq } from 'drizzle-orm';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { DrizzleService } from '@/common/drizzle/drizzle.service';
import { psychologistProfiles } from '@/modules/psychologists/psychologist-profile.schema';

export const REQUIRE_PSYCHOLOGIST_TYPE = 'requirePsychologistType';

export function RequirePsychologistType(type: 'internal' | 'external') {
  return function (
    target: any,
    _key?: string,
    descriptor?: PropertyDescriptor,
  ) {
    Reflect.defineMetadata(
      REQUIRE_PSYCHOLOGIST_TYPE,
      type,
      descriptor?.value ?? target,
    );
    return descriptor;
  };
}

@Injectable()
export class PsychologistTypeGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private drizzleService: DrizzleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredType = this.reflector.get<'internal' | 'external'>(
      REQUIRE_PSYCHOLOGIST_TYPE,
      context.getHandler(),
    );

    if (!requiredType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('No authenticated user found');
    }

    if (user.role !== 'psychologist') {
      throw new ForbiddenException(
        'Only psychologists can access this endpoint',
      );
    }

    const { db } = this.drizzleService;

    const [psychologistProfile] = await db
      .select({ isExternal: psychologistProfiles.isExternal })
      .from(psychologistProfiles)
      .where(eq(psychologistProfiles.userId, user.id));

    if (!psychologistProfile) {
      throw new ForbiddenException(
        'No psychologist profile found for this user',
      );
    }

    const isExternal = psychologistProfile.isExternal;
    const matchesRequiredType =
      (requiredType === 'external' && isExternal) ||
      (requiredType === 'internal' && !isExternal);

    if (!matchesRequiredType) {
      throw new ForbiddenException(
        `This endpoint is only available for ${requiredType} psychologists`,
      );
    }

    return true;
  }
}
