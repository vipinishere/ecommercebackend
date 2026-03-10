import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';  
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './users/users.module';
import { SellerModule } from './seller/seller.module';
import Joi from 'joi';

@Module({
  imports: [AuthModule, 
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
      }),
    }), UserModule, SellerModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
