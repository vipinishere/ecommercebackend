import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';

export interface AdminJwtPayload {
  sub: string;      // adminId
  email: string;
  role: AdminRole;  // role in payload so guard can check without DB call
}

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
    } as StrategyOptionsWithRequest);
  }

  async validate(payload: AdminJwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return {
      adminId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}