import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { DirectBuyDto } from './dto/direct-buy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('order')
@UseGuards(JwtAuthGuard) // all order routes are protected
export class OrderController {
  constructor(private orderService: OrderService) {}

  // POST /order/checkout
  @Post('checkout')
  placeOrder(
    @GetUser('userId') userId: string,
    @Body() dto: PlaceOrderDto,
  ) {
    return this.orderService.placeOrder(userId, dto);
  }

  // POST /order/buy-now
  @Post('buy-now')
  directBuy(
    @GetUser('userId') userId: string,
    @Body() dto: DirectBuyDto,
  ) {
    return this.orderService.directBuy(userId, dto);
  }

  // GET /order
  @Get()
  getOrders(@GetUser('userId') userId: string) {
    return this.orderService.getOrders(userId);
  }

  // GET /order/:id
  @Get(':id')
  getOrder(
    @GetUser('userId') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.getOrder(userId, orderId);
  }

  // PATCH /order/:id/cancel
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancelOrder(
    @GetUser('userId') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.cancelOrder(userId, orderId);
  }

  // PATCH /order/:id/return
  @Patch(':id/return')
  @HttpCode(HttpStatus.OK)
  returnOrder(
    @GetUser('userId') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.returnOrder(userId, orderId);
  }

  // GET /order/:id/track
  @Get(':id/track')
  trackOrder(
    @GetUser('userId') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.orderService.trackOrder(userId, orderId);
  }
}