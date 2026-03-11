import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { CreateWishlistDto } from './dto/create-wishlist.dto';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('wishlist')
@UseGuards(JwtAuthGuard) // all wishlist routes are protected
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  // ─── WISHLISTS ───────────────────────────────────────────────

  // POST /wishlist
  @Post()
  createWishlist(
    @GetUser('userId') userId: string,
    @Body() dto: CreateWishlistDto,
  ) {
    return this.wishlistService.createWishlist(userId, dto);
  }

  // GET /wishlist
  @Get()
  getWishlists(@GetUser('userId') userId: string) {
    return this.wishlistService.getWishlists(userId);
  }

  // GET /wishlist/:id
  @Get(':id')
  getWishlist(
    @GetUser('userId') userId: string,
    @Param('id') wishlistId: string,
  ) {
    return this.wishlistService.getWishlist(userId, wishlistId);
  }

  // DELETE /wishlist/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteWishlist(
    @GetUser('userId') userId: string,
    @Param('id') wishlistId: string,
  ) {
    return this.wishlistService.deleteWishlist(userId, wishlistId);
  }

  // ─── ITEMS ───────────────────────────────────────────────────

  // POST /wishlist/:id/items
  @Post(':id/items')
  addItem(
    @GetUser('userId') userId: string,
    @Param('id') wishlistId: string,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.addItem(userId, wishlistId, dto);
  }

  // DELETE /wishlist/:id/items/:itemId
  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @GetUser('userId') userId: string,
    @Param('id') wishlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.wishlistService.removeItem(userId, wishlistId, itemId);
  }

  // POST /wishlist/:id/items/:itemId/move-to-cart
  @Post(':id/items/:itemId/move-to-cart')
  @HttpCode(HttpStatus.OK)
  moveToCart(
    @GetUser('userId') userId: string,
    @Param('id') wishlistId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.wishlistService.moveToCart(userId, wishlistId, itemId);
  }
}