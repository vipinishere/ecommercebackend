import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';  
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './users/users.module';
import { SellerModule } from './seller/seller.module';
import { AdminModule } from './admin/admin.module';
import { CategoryModule } from './category/category.module';
import { SpecificationModule } from './specification/specification.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { OrderModule } from './order/order.module';
import { WalletModule } from './wallet/wallet.module';
import { ShipmentModule } from './shipment/shipment.module';
import { ReviewModule } from './review/review.module';
import Joi from 'joi';

@Module({
  imports: [AuthModule, 
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        SELLER_JWT_ACCESS_SECRET: Joi.string().required(),
        SELLER_JWT_REFRESH_SECRET: Joi.string().required(),
      }),
    }), UserModule, SellerModule, AdminModule, CategoryModule, SpecificationModule, ProductModule, CartModule, WishlistModule, OrderModule, WalletModule, ShipmentModule, ReviewModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
