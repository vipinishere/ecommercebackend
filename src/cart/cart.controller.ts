import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard) // all cart routes are protected
export class CartController {
  constructor(private cartService: CartService) {}

  // POST /cart
  @Post()
  addToCart(
    @GetUser('userId') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartService.addToCart(userId, dto);
  }

  // GET /cart
  @Get()
  getCart(@GetUser('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

  // PATCH /cart/:itemId
  @Patch(':itemId')
  updateQuantity(
    @GetUser('userId') userId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartDto,
  ) {
    return this.cartService.updateQuantity(userId, itemId, dto);
  }

  // DELETE /cart/:itemId
  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @GetUser('userId') userId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.cartService.removeItem(userId, itemId);
  }

  // DELETE /cart
  @Delete()
  @HttpCode(HttpStatus.OK)
  clearCart(@GetUser('userId') userId: string) {
    return this.cartService.clearCart(userId);
  }
}