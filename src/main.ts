import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // strips unknown fields
    forbidNonWhitelisted: true, // throws error on unknown fields
    transform: true // auto transform types
  }))
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
