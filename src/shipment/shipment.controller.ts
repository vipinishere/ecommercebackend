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
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AddTrackingEventDto } from './dto/add-tracking-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ShipmentStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { SellerJwtAuthGuard } from 'src/seller/guards/seller-jwt.guard';

class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;
}

@Controller('shipment')
export class ShipmentController {
  constructor(private shipmentService: ShipmentService) {}

  // ─── ADMIN / SELLER ONLY ─────────────────────────────────────

  // POST /shipment
  @Post()
  @UseGuards(AdminJwtAuthGuard)
  createShipment(@Body() dto: CreateShipmentDto) {
    return this.shipmentService.createShipment(dto);
  }

  // PATCH /shipment/:id/status
  @Patch(':id/status')
  @UseGuards(AdminJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param('id') shipmentId: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shipmentService.updateStatus(shipmentId, dto.status);
  }

  // POST /shipment/:id/tracking
  @Post(':id/tracking')
  @UseGuards(AdminJwtAuthGuard)
  addTrackingEvent(
    @Param('id') shipmentId: string,
    @Body() dto: AddTrackingEventDto,
  ) {
    return this.shipmentService.addTrackingEvent(shipmentId, dto);
  }

  // ─── USER ─────────────────────────────────────────────────────

  // GET /shipment/:id
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getShipment(
    @GetUser('userId') userId: string,
    @Param('id') shipmentId: string,
  ) {
    return this.shipmentService.getShipment(userId, shipmentId);
  }

  // GET /shipment/order/:orderId
  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  getShipmentsByOrder(
    @GetUser('userId') userId: string,
    @Param('orderId') orderId: string,
  ) {
    return this.shipmentService.getShipmentsByOrder(userId, orderId);
  }
}