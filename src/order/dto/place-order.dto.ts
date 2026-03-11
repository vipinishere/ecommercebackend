import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { PaymentType } from '@prisma/client';

export class PlaceOrderDto {
  @IsUUID()
  addressId: string;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  // Required only for WALLET payment
  @ValidateIf((o) => o.paymentType === PaymentType.WALLET)
  @IsUUID()
  walletId?: string;

  // Required only for CARD payment
  @ValidateIf((o) => o.paymentType === PaymentType.CARD)
  @IsUUID()
  cardId?: string;

  // Required only for UPI payment
  @ValidateIf((o) => o.paymentType === PaymentType.UPI)
  @IsString()
  upiId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}