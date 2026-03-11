import {
  IsNumber,
  IsPositive,
  IsEnum,
  Min,
  Max,
  IsCurrency,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentTypeForWallet } from '@prisma/client';

export class AddMoneyDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(10)
  @Max(100000)
  @Type(() => Number)
  amount: number;

  @IsEnum(PaymentTypeForWallet, {
    message: 'Payment type must be CARD or UPI to add money',
  })
  paymentType: PaymentTypeForWallet;
}