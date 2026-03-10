import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SellerRefreshTokenGuard extends AuthGuard('seller-jwt-refresh') {}