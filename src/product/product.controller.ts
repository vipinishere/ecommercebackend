import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { FillSpecificationsDto } from './dto/fill-specification.dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SellerJwtAuthGuard } from './../seller/guards/seller-jwt.guard';

@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  // ─── PUBLIC ───────────────────────────────────────────────────

  // GET /product
  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  // GET /product/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  // GET /product/:id/specifications
  @Get(':id/specifications')
  getSpecifications(@Param('id') productId: string) {
    return this.productService.getSpecifications(productId);
  }

  // ─── SELLER ONLY ──────────────────────────────────────────────

  // POST /product
  @Post()
  @UseGuards(SellerJwtAuthGuard)
  create(
    @GetUser('sellerId') sellerId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(sellerId, dto);
  }

  // PATCH /product/:id
  @Patch(':id')
  @UseGuards(SellerJwtAuthGuard)
  update(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(sellerId, productId, dto);
  }

  // DELETE /product/:id
  @Delete(':id')
  @UseGuards(SellerJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  remove(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
  ) {
    return this.productService.remove(sellerId, productId);
  }

  // ─── IMAGES ───────────────────────────────────────────────────

  // POST /product/:id/images
  @Post(':id/images')
  @UseGuards(SellerJwtAuthGuard)
  addImage(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
    @Body() dto: AddProductImageDto,
  ) {
    return this.productService.addImage(sellerId, productId, dto);
  }

  // DELETE /product/:id/images/:imageId
  @Delete(':id/images/:imageId')
  @UseGuards(SellerJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  removeImage(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productService.removeImage(sellerId, productId, imageId);
  }

  // ─── VARIANTS ─────────────────────────────────────────────────

  // POST /product/:id/variants
  @Post(':id/variants')
  @UseGuards(SellerJwtAuthGuard)
  createVariant(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productService.createVariant(sellerId, productId, dto);
  }

  // PATCH /product/:id/variants/:variantId
  @Patch(':id/variants/:variantId')
  @UseGuards(SellerJwtAuthGuard)
  updateVariant(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productService.updateVariant(sellerId, productId, variantId, dto);
  }

  // DELETE /product/:id/variants/:variantId
  @Delete(':id/variants/:variantId')
  @UseGuards(SellerJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  removeVariant(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productService.removeVariant(sellerId, productId, variantId);
  }

  // ─── SPECIFICATIONS ───────────────────────────────────────────

  // POST /product/:id/specifications
  @Post(':id/specifications')
  @UseGuards(SellerJwtAuthGuard)
  fillSpecifications(
    @GetUser('sellerId') sellerId: string,
    @Param('id') productId: string,
    @Body() dto: FillSpecificationsDto,
  ) {
    return this.productService.fillSpecifications(sellerId, productId, dto);
  }
}