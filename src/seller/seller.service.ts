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
import { RegisterSellerDto } from './dto/register-seller.dto';
import { LoginSellerDto } from './dto/login-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class SellerService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ─── REGISTER ───────────────────────────────────────────────

  async register(dto: RegisterSellerDto) {
    const existing = await this.prisma.seller.findUnique({
      where: { contactEmail: dto.contactEmail },
    });

    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const seller = await this.prisma.seller.create({
      data: {
        businessName: dto.businessName,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        password: dto.password
      },
      select: {
        id: true,
        businessName: true,
        contactEmail: true,
        contactPhone: true,
        isVerified: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(seller.id, seller.contactEmail);
    await this.saveRefreshToken(seller.id, tokens.refreshToken);

    return { seller, ...tokens };
  }

  // ─── LOGIN ───────────────────────────────────────────────────

  async login(dto: LoginSellerDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { contactEmail: dto.email },
    });

    if (!seller) throw new UnauthorizedException('Invalid credentials');

    if (!seller.isActive) {
      throw new ForbiddenException('Seller account is deactivated');
    }

    const passwordMatch = await bcrypt.compare(dto.password, seller.password);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(seller.id, seller.contactEmail);
    await this.saveRefreshToken(seller.id, tokens.refreshToken);

    return {
      seller: {
        id: seller.id,
        businessName: seller.businessName,
        contactEmail: seller.contactEmail,
        isVerified: seller.isVerified,
      },
      ...tokens,
    };
  }

  // ─── REFRESH ─────────────────────────────────────────────────

  async refresh(sellerId: string, refreshToken: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller || !seller.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (seller.refreshToken !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(seller.id, seller.contactEmail);
    await this.saveRefreshToken(seller.id, tokens.refreshToken);

    return tokens;
  }

  // ─── LOGOUT ──────────────────────────────────────────────────

  async logout(sellerId: string) {
    await this.prisma.seller.update({
      where: { id: sellerId },
      data: { refreshToken: null },
    });

    return { message: 'Logged out successfully' };
  }

  // ─── GET PROFILE ─────────────────────────────────────────────

  async getProfile(sellerId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        businessName: true,
        contactEmail: true,
        contactPhone: true,
        isVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!seller) throw new NotFoundException('Seller not found');
    return seller;
  }

  // ─── UPDATE PROFILE ──────────────────────────────────────────

  async updateProfile(sellerId: string, dto: UpdateSellerDto) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) throw new NotFoundException('Seller not found');

    return this.prisma.seller.update({
      where: { id: sellerId },
      data: dto,
      select: {
        id: true,
        businessName: true,
        contactEmail: true,
        contactPhone: true,
        updatedAt: true,
      },
    });
  }

  // ─── GET PRODUCTS ─────────────────────────────────────────────

  async getProducts(sellerId: string) {
    return this.prisma.product.findMany({
      where: { sellerId },
      select: {
        id: true,
        internalName: true,
        seoTitle: true,
        mrp: true,
        discountPercent: true,
        sku: true,
        isFreeDelivery: true,
        isPayOnDelivery: true,
        createdAt: true,
        category: {
          select: { id: true, name: true },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            mrp: true,
            sellingPrice: true,
            stockQuantity: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── GET ORDERS ──────────────────────────────────────────────

  async getOrders(sellerId: string) {
    return this.prisma.orderItem.findMany({
      where: { sellerId },
      select: {
        id: true,
        quantity: true,
        unitPriceAtPurchase: true,
        totalPrice: true,
        productNameSnapshot: true,
        productSkuSnapshot: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            placedAt: true,
          },
        },
        product: {
          select: { id: true, internalName: true },
        },
        variant: {
          select: { id: true, sku: true, color: true, size: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  private async generateTokens(sellerId: string, email: string) {
    const payload = { sub: sellerId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('SELLER_JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('SELLER_JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(sellerId: string, token: string) {
    await this.prisma.seller.update({
      where: { id: sellerId },
      data: { refreshToken: token },  // directly stored in seller table
    });
  }
}