import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard) // all routes in this controller are protected
export class UserController {
  constructor(private userService: UserService) {}

  // ─── PROFILE ─────────────────────────────────────────────────

  // GET /user/profile
  @Get('profile')
  getProfile(@GetUser('userId') userId: string) {
    return this.userService.getProfile(userId);
  }

  // PATCH /user/profile
  @Patch('profile')
  updateProfile(
    @GetUser('userId') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, dto);
  }

  // PATCH /user/password
  @Patch('password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @GetUser('userId') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(userId, dto);
  }

  // ─── ADDRESSES ───────────────────────────────────────────────

  // POST /user/addresses
  @Post('addresses')
  createAddress(
    @GetUser('userId') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.userService.createAddress(userId, dto);
  }

  // GET /user/addresses
  @Get('addresses')
  getAddresses(@GetUser('userId') userId: string) {
    return this.userService.getAddresses(userId);
  }

  // GET /user/addresses/:id
  @Get('addresses/:id')
  getAddress(
    @GetUser('userId') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.userService.getAddress(userId, addressId);
  }

  // PATCH /user/addresses/:id
  @Patch('addresses/:id')
  updateAddress(
    @GetUser('userId') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.userService.updateAddress(userId, addressId, dto);
  }

  // DELETE /user/addresses/:id
  @Delete('addresses/:id')
  @HttpCode(HttpStatus.OK)
  deleteAddress(
    @GetUser('userId') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.userService.deleteAddress(userId, addressId);
  }

  // PATCH /user/addresses/:id/default
  @Patch('addresses/:id/default')
  setDefaultAddress(
    @GetUser('userId') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.userService.setDefaultAddress(userId, addressId);
  }
}