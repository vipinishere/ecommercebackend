import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SellerService } from './seller.service';
import { SellerController } from './seller.controller';
import { SellerJwtStrategy } from './strategies/seller-jwt.strategy';
import { SellerRefreshTokenStrategy } from './strategies/seller-refresh-token.strategy';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [SellerController],
  providers: [
    SellerService,
    SellerJwtStrategy,
    SellerRefreshTokenStrategy,
  ],
  exports: [SellerService, SellerJwtStrategy],
})
export class SellerModule {}