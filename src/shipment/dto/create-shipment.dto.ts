import {
  IsUUID,
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateShipmentDto {
  @IsUUID()
  orderId: string;

  @IsString()
  @MaxLength(100)
  trackingNumber: string;

  @IsString()
  @MaxLength(100)
  carrier: string;

  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}