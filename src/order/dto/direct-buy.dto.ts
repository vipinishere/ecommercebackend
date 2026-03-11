import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  IsPositive,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { PaymentType } from '@prisma/client';
import { Type } from 'class-transformer';

export class DirectBuyDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  variantId: string;

  @IsInt()
  @IsPositive()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  quantity: number;

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