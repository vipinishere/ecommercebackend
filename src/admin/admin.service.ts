import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { AdminRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── REGISTER ───────────────────────────────────────────────

  async register(dto: RegisterAdminDto, requestingAdminRole?: AdminRole) {
    // Only SUPER_ADMIN can create another SUPER_ADMIN
    if (
      dto.role === AdminRole.SUPER_ADMIN &&
      requestingAdminRole !== AdminRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Only SUPER_ADMIN can create another SUPER_ADMIN');
    }

    const existing = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const admin = await this.prisma.admin.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role ?? AdminRole.ADMIN,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(admin.id, admin.email, admin.role);
    await this.saveRefreshToken(admin.id, tokens.refreshToken);

    return { admin, ...tokens };
  }

  // ─── LOGIN ───────────────────────────────────────────────────

  async login(dto: LoginAdminDto) {
    const admin = await this.prisma.admin.findUnique({
      where: { email: dto.email },
    });

    if (!admin) throw new UnauthorizedException('Invalid credentials');

    if (!admin.isActive) {
      throw new ForbiddenException('Admin account is deactivated');
    }

    const passwordMatch = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(admin.id, admin.email, admin.role);
    await this.saveRefreshToken(admin.id, tokens.refreshToken);

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      ...tokens,
    };
  }

  // ─── REFRESH ─────────────────────────────────────────────────

  async refresh(adminId: string, refreshToken: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin || !admin.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (admin.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(admin.id, admin.email, admin.role);
    await this.saveRefreshToken(admin.id, tokens.refreshToken);

    return tokens;
  }

  // ─── LOGOUT ──────────────────────────────────────────────────

  async logout(adminId: string) {
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  // ─── GET PROFILE ─────────────────────────────────────────────

  async getProfile(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  private async generateTokens(
    adminId: string,
    email: string,
    role: AdminRole,
  ) {
    const payload = { sub: adminId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('ADMIN_JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('ADMIN_JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(adminId: string, token: string) {
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { refreshToken: token },
    });
  }
}