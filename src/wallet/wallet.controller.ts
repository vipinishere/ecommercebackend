import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AddMoneyDto } from './dto/add-money.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('wallet')
@UseGuards(JwtAuthGuard) // all wallet routes are protected
export class WalletController {
  constructor(private walletService: WalletService) {}

  // POST /wallet
  @Post()
  createWallet(@GetUser('userId') userId: string) {
    return this.walletService.createWallet(userId);
  }

  // GET /wallet
  @Get()
  getWallet(@GetUser('userId') userId: string) {
    return this.walletService.getWallet(userId);
  }

  // GET /wallet/transactions
  @Get('transactions')
  getTransactions(@GetUser('userId') userId: string) {
    return this.walletService.getTransactions(userId);
  }

  // POST /wallet/add-money
  @Post('add-money')
  @HttpCode(HttpStatus.OK)
  addMoney(
    @GetUser('userId') userId: string,
    @Body() dto: AddMoneyDto,
  ) {
    return this.walletService.addMoney(userId, dto);
  }
}