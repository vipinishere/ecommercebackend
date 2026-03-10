import { PartialType, PickType } from '@nestjs/swagger';
import { RegisterSellerDto } from './register-seller.dto';

export class UpdateSellerDto extends PartialType(
  PickType(RegisterSellerDto, ['businessName', 'contactPhone'] as const)
) {}