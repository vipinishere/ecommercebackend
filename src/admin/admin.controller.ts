import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import { AdminRefreshTokenGuard } from './guards/admin-refresh-token.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { AdminRole } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // ─── AUTH ────────────────────────────────────────────────────

  // POST /admin/auth/register
  // First admin — no auth needed (bootstrap)
  // Creating SUPER_ADMIN — needs existing SUPER_ADMIN token
  @Post('auth/register')
  register(
    @Body() dto: RegisterAdminDto,
    @GetUser('role') role?: AdminRole,
  ) {
    return this.adminService.register(dto, role);
  }

  // POST /admin/auth/login
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginAdminDto) {
    return this.adminService.login(dto);
  }

  // POST /admin/auth/refresh
  @Post('auth/refresh')
  @UseGuards(AdminRefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  refresh(
    @GetUser('adminId') adminId: string,
    @GetUser('refreshToken') refreshToken: string,
  ) {
    return this.adminService.refresh(adminId, refreshToken);
  }

  // POST /admin/auth/logout
  @Post('auth/logout')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@GetUser('adminId') adminId: string) {
    return this.adminService.logout(adminId);
  }

  // ─── PROFILE ─────────────────────────────────────────────────

  // GET /admin/profile
  @Get('profile')
  @UseGuards(AdminJwtAuthGuard)
  getProfile(@GetUser('adminId') adminId: string) {
    return this.adminService.getProfile(adminId);
  }

  // ─── SUPER ADMIN ONLY ────────────────────────────────────────

  // POST /admin/auth/register (with SUPER_ADMIN role)
  // Already handled above — role check done in service layer
}