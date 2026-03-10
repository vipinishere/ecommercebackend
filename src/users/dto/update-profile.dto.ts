import { PartialType, PickType } from "@nestjs/swagger";
import { RegisterDto } from "src/auth/dto/register.dto";

export class UpdateProfileDto extends PartialType(PickType(RegisterDto, ['name', 'alternativeNumber', 'primaryNumber'] as const)){}