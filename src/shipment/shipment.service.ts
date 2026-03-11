import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AddTrackingEventDto } from './dto/add-tracking-event.dto';
import { ShipmentStatus, OrderStatus } from '@prisma/client';

@Injectable()
export class ShipmentService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE SHIPMENT ─────────────────────────────────────────

  async createShipment(dto: CreateShipmentDto) {
    // Validate order exists
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Order must be PACKED to create shipment
    if (order.orderStatus !== OrderStatus.PACKED) {
      throw new BadRequestException(
        'Order must be in PACKED status before creating shipment',
      );
    }

    // Check tracking number uniqueness
    const existing = await this.prisma.shipment.findUnique({
      where: { trackingNumber: dto.trackingNumber },
    });
    if (existing) {
      throw new BadRequestException('Tracking number already exists');
    }

    // Create shipment
    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: dto.orderId,
        trackingNumber: dto.trackingNumber,
        carrier: dto.carrier,
        status: ShipmentStatus.PROCESSING,
        estimatedDelivery: dto.estimatedDelivery
          ? new Date(dto.estimatedDelivery)
          : null,
      },
    });

    // Update order status to SHIPPED
    await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { orderStatus: OrderStatus.SHIPPED },
    });

    // Add initial tracking event
    await this.prisma.shipmentTrackingEvent.create({
      data: {
        shipmentId: shipment.id,
        eventStatus: 'Shipment Created',
        location: 'Warehouse',
        eventTime: new Date(),
      },
    });

    return shipment;
  }

  // ─── GET SHIPMENT ─────────────────────────────────────────────

  async getShipment(userId: string, shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderStatus: true,
            userId: true,
          },
        },
        trackingEvents: {
          orderBy: { eventTime: 'desc' },
        },
      },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    // Only order owner can view shipment
    if (shipment.order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return shipment;
  }

  // ─── GET SHIPMENTS BY ORDER ───────────────────────────────────

  async getShipmentsByOrder(userId: string, orderId: string) {
    // Validate order belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.shipment.findMany({
      where: { orderId },
      include: {
        trackingEvents: {
          orderBy: { eventTime: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── UPDATE SHIPMENT STATUS ───────────────────────────────────

  async updateStatus(shipmentId: string, status: ShipmentStatus) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    // Validate status transition
    this.validateStatusTransition(shipment.status, status);

    // Update shipment
    const updatedShipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status,
        shippedAt:
          status === ShipmentStatus.SHIPPED ? new Date() : shipment.shippedAt,
        deliveredAt:
          status === ShipmentStatus.DELIVERED ? new Date() : shipment.deliveredAt,
      },
    });

    // Sync order status with shipment status
    const orderStatusMap: Partial<Record<ShipmentStatus, OrderStatus>> = {
      [ShipmentStatus.SHIPPED]: OrderStatus.SHIPPED,
      [ShipmentStatus.OUT_FOR_DELIVERY]: OrderStatus.SHIPPED,
      [ShipmentStatus.DELIVERED]: OrderStatus.DELIVERED,
      [ShipmentStatus.FAILED]: OrderStatus.CANCELLED,
    };

    const newOrderStatus = orderStatusMap[status];
    if (newOrderStatus) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: {
          orderStatus: newOrderStatus,
          deliveredAt:
            status === ShipmentStatus.DELIVERED ? new Date() : undefined,
        },
      });
    }

    return updatedShipment;
  }

  // ─── ADD TRACKING EVENT ───────────────────────────────────────

  async addTrackingEvent(
    shipmentId: string,
    dto: AddTrackingEventDto,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    // Cannot add events to delivered or failed shipments
    if (
      shipment.status === ShipmentStatus.DELIVERED ||
      shipment.status === ShipmentStatus.FAILED
    ) {
      throw new BadRequestException(
        'Cannot add tracking events to a completed shipment',
      );
    }

    return this.prisma.shipmentTrackingEvent.create({
      data: {
        shipmentId,
        eventStatus: dto.eventStatus,
        location: dto.location,
        eventTime: new Date(dto.eventTime),
      },
    });
  }

  // ─── HELPER — Validate Status Transition ─────────────────────

  private validateStatusTransition(
    current: ShipmentStatus,
    next: ShipmentStatus,
  ) {
    const validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
      [ShipmentStatus.PROCESSING]: [ShipmentStatus.SHIPPED, ShipmentStatus.FAILED],
      [ShipmentStatus.SHIPPED]: [ShipmentStatus.OUT_FOR_DELIVERY, ShipmentStatus.FAILED],
      [ShipmentStatus.OUT_FOR_DELIVERY]: [ShipmentStatus.DELIVERED, ShipmentStatus.FAILED],
      [ShipmentStatus.DELIVERED]: [],
      [ShipmentStatus.FAILED]: [],
    };

    if (!validTransitions[current].includes(next)) {
      throw new BadRequestException(
        `Cannot transition shipment from ${current} to ${next}`,
      );
    }
  }
}
