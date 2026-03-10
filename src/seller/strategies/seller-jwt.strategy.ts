import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptionsWithRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface SellerJwtPayload {
  sub: string;   // sellerId
  email: string;
}

@Injectable()
export class SellerJwtStrategy extends PassportStrategy(Strategy, 'seller-jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SELLER_JWT_ACCESS_SECRET'),
    } as StrategyOptionsWithRequest);
  }

  async validate(payload: SellerJwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();
    return { sellerId: payload.sub, email: payload.email };
  }
}