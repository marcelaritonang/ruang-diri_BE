import { SetMetadata } from '@nestjs/common';

export type Role =
  | 'super_admin'
  | 'organization'
  | 'student'
  | 'employee'
  | 'psychologist'
  | 'client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
