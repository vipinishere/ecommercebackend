import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { DirectBuyDto } from './dto/direct-buy.dto';
import { PaymentType, OrderStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // ─── HELPER — Generate Order Number ──────────────────────────

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ORD-${timestamp}-${random}`;
  }

  // ─── HELPER — Validate Address ────────────────────────────────

  private async validateAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) {
      throw new ForbiddenException('Address does not belong to you');
    }
    return address;
  }

  // ─── HELPER — Process Payment ─────────────────────────────────

  private async processPayment(
    userId: string,
    paymentType: PaymentType,
    amount: number,
    dto: PlaceOrderDto | DirectBuyDto,
  ) {
    // Get or create payment method
    let paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { userId, paymentType },
    });

    if (!paymentMethod) {
      paymentMethod = await this.prisma.paymentMethod.create({
        data: { userId, paymentType },
      });
    }

    if (paymentType === PaymentType.WALLET) {
      // Deduct from wallet
      const wallet = await this.prisma.walletAccount.findUnique({
        where: { userId },
      });

      if (!wallet) throw new NotFoundException('Wallet not found');
      if (Number(wallet.currentBalance) < amount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      await this.prisma.walletAccount.update({
        where: { userId },
        data: { currentBalance: { decrement: amount } },
      });

      // Record wallet transaction
      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'DEBIT',
          referenceType: 'ORDER',
          amount,
          balanceAfterTransaction: Number(wallet.currentBalance) - amount,
          status: 'COMPLETED',
        },
      });
    }

    if (paymentType === PaymentType.CARD) {
      // Validate card belongs to user
      const card = await this.prisma.cardDetail.findUnique({
        where: { id: (dto as any).cardId },
      });
      if (!card) throw new NotFoundException('Card not found');
      if (card.userId !== userId) {
        throw new ForbiddenException('Card does not belong to you');
      }
    }

    // Create transaction detail
    const transactionDetail = await this.prisma.transactionDetail.create({
      data: {
        userId,
        paymentMethodId: paymentMethod.id,
        transactionId: `TXN-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase()}`,
        transactionStatus:
          paymentType === PaymentType.COD ? 'PENDING' : 'SUCCESS',
      },
    });

    return { paymentMethod, transactionDetail };
  }

  // ─── HELPER — Create Order Items ──────────────────────────────

  private async createOrderItems(
    orderId: string,
    items: {
      productId: string;
      variantId: string;
      quantity: number;
      sellerId: string;
      productNameSnapshot: string;
      productSkuSnapshot: string;
      unitPriceAtPurchase: number;
      totalPrice: number;
    }[],
  ) {
    return this.prisma.orderItem.createMany({
      data: items.map((item) => ({ orderId, ...item })),
    });
  }

  // ─── HELPER — Calculate Amounts ───────────────────────────────

  private calculateAmounts(
    items: { sellingPrice: number; quantity: number }[],
    paymentType: PaymentType,
  ) {
    const totalItemsAmount = items.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0,
    );
    const shippingCharge = totalItemsAmount > 500 ? 0 : 49;
    const codFee = paymentType === PaymentType.COD ? 29 : 0;
    const grandTotal = totalItemsAmount + shippingCharge + codFee;

    return { totalItemsAmount, shippingCharge, codFee, grandTotal };
  }

  // ─── PLACE ORDER FROM CART ────────────────────────────────────

  async placeOrder(userId: string, dto: PlaceOrderDto) {
    // Validate address
    await this.validateAddress(userId, dto.addressId);

    // Get cart items
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: true,
        variant: true,
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate stock for all items
    for (const item of cartItems) {
      if (!item.variant.isActive) {
        throw new BadRequestException(
          `Variant for ${item.product.internalName} is unavailable`,
        );
      }
      if (item.variant.stockQuantity < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.internalName}. Available: ${item.variant.stockQuantity}`,
        );
      }
    }

    // Calculate amounts
    const { totalItemsAmount, shippingCharge, codFee, grandTotal } =
      this.calculateAmounts(
        cartItems.map((i) => ({
          sellingPrice: Number(i.variant.sellingPrice),
          quantity: i.quantity,
        })),
        dto.paymentType,
      );

    // Process payment
    const { paymentMethod, transactionDetail } = await this.processPayment(
      userId,
      dto.paymentType,
      grandTotal,
      dto,
    );

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId,
        orderStatus: OrderStatus.PENDING,
        totalItemsAmount,
        shippingCharge,
        codFee,
        grandTotal,
        placedAt: new Date(),
        paidAt: dto.paymentType !== PaymentType.COD ? new Date() : null,
      },
    });

    // Create order items
    await this.createOrderItems(
      order.id,
      cartItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        sellerId: item.product.sellerId,
        quantity: item.quantity,
        productNameSnapshot: item.product.internalName,
        productSkuSnapshot: item.variant.sku,
        unitPriceAtPurchase: Number(item.variant.sellingPrice),
        totalPrice: Number(item.variant.sellingPrice) * item.quantity,
      })),
    );

    // Create order payment
    await this.prisma.orderPayment.create({
      data: {
        orderId: order.id,
        paymentMethodId: paymentMethod.id,
        transactionDetailId: transactionDetail.id,
        amount: grandTotal,
        paidAt: dto.paymentType !== PaymentType.COD ? new Date() : null,
      },
    });

    // Deduct stock for all items
    for (const item of cartItems) {
      await this.prisma.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    // Clear cart after order placed
    await this.prisma.cartItem.deleteMany({ where: { userId } });

    return this.getOrder(userId, order.id);
  }

  // ─── DIRECT BUY ───────────────────────────────────────────────

  async directBuy(userId: string, dto: DirectBuyDto) {
    // Validate address
    await this.validateAddress(userId, dto.addressId);

    // Validate product and variant
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.productId !== dto.productId) {
      throw new BadRequestException('Variant does not belong to this product');
    }
    if (!variant.isActive) {
      throw new BadRequestException('This variant is currently unavailable');
    }
    if (variant.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${variant.stockQuantity}`,
      );
    }

    // Calculate amounts
    const { totalItemsAmount, shippingCharge, codFee, grandTotal } =
      this.calculateAmounts(
        [{ sellingPrice: Number(variant.sellingPrice), quantity: dto.quantity }],
        dto.paymentType,
      );

    // Process payment
    const { paymentMethod, transactionDetail } = await this.processPayment(
      userId,
      dto.paymentType,
      grandTotal,
      dto,
    );

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        userId,
        orderStatus: OrderStatus.PENDING,
        totalItemsAmount,
        shippingCharge,
        codFee,
        grandTotal,
        placedAt: new Date(),
        paidAt: dto.paymentType !== PaymentType.COD ? new Date() : null,
      },
    });

    // Create order item
    await this.createOrderItems(order.id, [
      {
        productId: dto.productId,
        variantId: dto.variantId,
        sellerId: product.sellerId,
        quantity: dto.quantity,
        productNameSnapshot: product.internalName,
        productSkuSnapshot: variant.sku,
        unitPriceAtPurchase: Number(variant.sellingPrice),
        totalPrice: Number(variant.sellingPrice) * dto.quantity,
      },
    ]);

    // Create order payment
    await this.prisma.orderPayment.create({
      data: {
        orderId: order.id,
        paymentMethodId: paymentMethod.id,
        transactionDetailId: transactionDetail.id,
        amount: grandTotal,
        paidAt: dto.paymentType !== PaymentType.COD ? new Date() : null,
      },
    });

    // Deduct stock
    await this.prisma.productVariant.update({
      where: { id: dto.variantId },
      data: { stockQuantity: { decrement: dto.quantity } },
    });

    return this.getOrder(userId, order.id);
  }

  // ─── GET ORDER HISTORY ────────────────────────────────────────

  async getOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      select: {
        id: true,
        orderNumber: true,
        orderStatus: true,
        grandTotal: true,
        placedAt: true,
        deliveredAt: true,
        items: {
          select: {
            id: true,
            productNameSnapshot: true,
            productSkuSnapshot: true,
            quantity: true,
            unitPriceAtPurchase: true,
            totalPrice: true,
            product: {
              select: {
                images: {
                  where: { isPrimary: true },
                  select: { imageUrl: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── GET SINGLE ORDER ─────────────────────────────────────────

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                internalName: true,
                images: {
                  where: { isPrimary: true },
                  select: { imageUrl: true },
                  take: 1,
                },
              },
            },
            variant: {
              select: {
                id: true,
                color: true,
                size: true,
                storage: true,
              },
            },
            seller: {
              select: { id: true, businessName: true },
            },
          },
        },
        shipments: {
          include: {
            trackingEvents: {
              orderBy: { eventTime: 'desc' },
            },
          },
        },
        payments: {
          include: {
            paymentMethod: { select: { paymentType: true } },
            transactionDetail: {
              select: { transactionId: true, transactionStatus: true },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException('Access denied');

    return order;
  }

  // ─── CANCEL ORDER ─────────────────────────────────────────────

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.getOrder(userId, orderId);

    // Only PENDING or PACKED orders can be cancelled
    if (
      order.orderStatus !== OrderStatus.PENDING &&
      order.orderStatus !== OrderStatus.PACKED
    ) {
      throw new BadRequestException(
        `Cannot cancel order in ${order.orderStatus} status`,
      );
    }

    // Restore stock for all items
    for (const item of order.items) {
      await this.prisma.productVariant.update({
        where: { id: item.variantId as string },
        data: { stockQuantity: { increment: item.quantity } },
      });
    }

    // Refund to wallet if paid online
    const payment = order.payments[0];
    if (
      payment &&
      payment.paymentMethod.paymentType !== PaymentType.COD
    ) {
      const wallet = await this.prisma.walletAccount.findUnique({
        where: { userId },
      });

      if (wallet) {
        await this.prisma.walletAccount.update({
          where: { userId },
          data: { currentBalance: { increment: Number(order.grandTotal) } },
        });

        await this.prisma.walletTransaction.create({
          data: {
            walletId: wallet.id,
            transactionType: 'CREDIT',
            referenceType: 'REFUND',
            amount: Number(order.grandTotal),
            balanceAfterTransaction:
              Number(wallet.currentBalance) + Number(order.grandTotal),
            status: 'COMPLETED',
          },
        });
      }
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: OrderStatus.CANCELLED },
    });
  }

  // ─── RETURN ORDER ─────────────────────────────────────────────

  async returnOrder(userId: string, orderId: string) {
    const order = await this.getOrder(userId, orderId);

    // Only DELIVERED orders can be returned
    if (order.orderStatus !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Only delivered orders can be returned',
      );
    }

    // Refund to wallet
    const wallet = await this.prisma.walletAccount.findUnique({
      where: { userId },
    });

    if (wallet) {
      await this.prisma.walletAccount.update({
        where: { userId },
        data: { currentBalance: { increment: Number(order.grandTotal) } },
      });

      await this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: 'CREDIT',
          referenceType: 'REFUND',
          amount: Number(order.grandTotal),
          balanceAfterTransaction:
            Number(wallet.currentBalance) + Number(order.grandTotal),
          status: 'COMPLETED',
        },
      });
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { orderStatus: OrderStatus.RETURNED },
    });
  }

  // ─── TRACK ORDER ──────────────────────────────────────────────

  async trackOrder(userId: string, orderId: string) {
    const order = await this.getOrder(userId, orderId);

    return {
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      placedAt: order.placedAt,
      deliveredAt: order.deliveredAt,
      shipments: order.shipments.map((shipment) => ({
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        status: shipment.status,
        shippedAt: shipment.shippedAt,
        estimatedDelivery: shipment.estimatedDelivery,
        deliveredAt: shipment.deliveredAt,
        trackingEvents: shipment.trackingEvents,
      })),
    };
  }
}