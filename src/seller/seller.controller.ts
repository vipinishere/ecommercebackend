import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SellerService } from './seller.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { LoginSellerDto } from './dto/login-seller.dto';
import { UpdateSellerDto } from './dto/update-seller.dto';
import { RefreshTokenDto } from '../auth/dto/refresh-token.dto';
import { SellerJwtAuthGuard } from './guards/seller-jwt.guard';
import { SellerRefreshTokenGuard } from './guards/seller-refresh-token.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('seller')
export class SellerController {
  constructor(private sellerService: SellerService) {}

  // ─── AUTH ────────────────────────────────────────────────────

  // POST /seller/auth/register
  @Post('auth/register')
  register(@Body() dto: RegisterSellerDto) {
    return this.sellerService.register(dto);
  }

  // POST /seller/auth/login
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginSellerDto) {
    return this.sellerService.login(dto);
  }

  // POST /seller/auth/refresh
  @Post('auth/refresh')
  @UseGuards(SellerRefreshTokenGuard)
  @HttpCode(HttpStatus.OK)
  refresh(
    @GetUser('sellerId') sellerId: string,
    @GetUser('refreshToken') refreshToken: string,
  ) {
    return this.sellerService.refresh(sellerId, refreshToken);
  }

  // POST /seller/auth/logout
  @Post('auth/logout')
  @UseGuards(SellerJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(@GetUser('sellerId') sellerId: string) {
    return this.sellerService.logout(sellerId);
  }

  // ─── PROFILE ─────────────────────────────────────────────────

  // GET /seller/profile
  @Get('profile')
  @UseGuards(SellerJwtAuthGuard)
  getProfile(@GetUser('sellerId') sellerId: string) {
    return this.sellerService.getProfile(sellerId);
  }

  // PATCH /seller/profile
  @Patch('profile')
  @UseGuards(SellerJwtAuthGuard)
  updateProfile(
    @GetUser('sellerId') sellerId: string,
    @Body() dto: UpdateSellerDto,
  ) {
    return this.sellerService.updateProfile(sellerId, dto);
  }

  // ─── PRODUCTS & ORDERS ───────────────────────────────────────

  // GET /seller/products
  @Get('products')
  @UseGuards(SellerJwtAuthGuard)
  getProducts(@GetUser('sellerId') sellerId: string) {
    return this.sellerService.getProducts(sellerId);
  }

  // GET /seller/orders
  @Get('orders')
  @UseGuards(SellerJwtAuthGuard)
  getOrders(@GetUser('sellerId') sellerId: string) {
    return this.sellerService.getOrders(sellerId);
  }
}