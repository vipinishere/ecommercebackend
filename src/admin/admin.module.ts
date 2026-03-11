import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';
import { AdminRefreshTokenStrategy } from './strategies/admin-refresh-token.strategy';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminJwtStrategy,
    AdminRefreshTokenStrategy,
    RolesGuard,
  ],
  exports: [
    AdminService,
    AdminJwtStrategy,
    RolesGuard,
  ],
})
export class AdminModule {}