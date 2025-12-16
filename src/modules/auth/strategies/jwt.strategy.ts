import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { env } from '@/config/env.config';
import { Role } from '../decorators/roles.decorator';

export interface IJwtPayload {
  sub: string;
  email: string;
  role: Role;
  fullName: string;
  organizationId?: string;
}

export interface IUser {
  id: string;
  email: string;
  role: Role;
  fullName: string;
  organizationId?: string;
}

export type IUserRequest = Request & {
  user: IUser;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: IJwtPayload): Promise<IUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organizationId,
      fullName: payload.fullName,
    };
  }
}
