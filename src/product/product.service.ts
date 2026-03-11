import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto, SortBy } from './dto/product-query.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { AddProductImageDto } from './dto/add-product-image.dto';
import { FillSpecificationsDto } from './dto/fill-specification.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE PRODUCT ──────────────────────────────────────────

  async create(sellerId: string, dto: CreateProductDto) {
    // Validate category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    // Validate returnPolicy exists if provided
    if (dto.returnPolicyId) {
      const policy = await this.prisma.returnPolicy.findUnique({
        where: { id: dto.returnPolicyId },
      });
      if (!policy) throw new NotFoundException('Return policy not found');
      if (!policy.isActive) throw new BadRequestException('Return policy is inactive');
    }

    return this.prisma.product.create({
      data: { sellerId, ...dto },
      include: {
        category: { select: { id: true, name: true } },
        seller: { select: { id: true, businessName: true } },
        images: true,
        variants: true,
      },
    });
  }

  // ─── GET ALL PRODUCTS ─────────────────────────────────────────

  async findAll(query: ProductQueryDto) {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      minRating,
      sortBy,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    // Search by name
    if (search) {
      where.OR = [
        { internalName: { contains: search, mode: 'insensitive' } },
        { seoTitle: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by category — include subcategories
    if (categoryId) {
      const subcategoryIds = await this.getSubcategoryIds(categoryId);
      where.categoryId = { in: [categoryId, ...subcategoryIds] };
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      where.mrp = {};
      if (minPrice) where.mrp.gte = minPrice;
      if (maxPrice) where.mrp.lte = maxPrice;
    }

    // Filter by rating
    if (minRating) {
      where.productRatingSummaries = {
        some: { averageRating: { gte: minRating } },
      };
    }

    // Build orderBy clause
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy === SortBy.PRICE_LOW_TO_HIGH) orderBy = { mrp: 'asc' };
    if (sortBy === SortBy.PRICE_HIGH_TO_LOW) orderBy = { mrp: 'desc' };
    if (sortBy === SortBy.NEWEST) orderBy = { createdAt: 'desc' };
    if (sortBy === SortBy.RATING) {
      orderBy = {
        productRatingSummaries: { 
          _count: "desc"
         },
      };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          internalName: true,
          seoTitle: true,
          mrp: true,
          discountPercent: true,
          isFreeDelivery: true,
          isPayOnDelivery: true,
          createdAt: true,
          category: { select: { id: true, name: true } },
          seller: { select: { id: true, businessName: true } },
          images: {
            where: { isPrimary: true },
            select: { imageUrl: true, altText: true },
            take: 1,
          },
          productRatingSummaries: {
            select: { averageRating: true, totalReviews: true },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              sellingPrice: true,
              stockQuantity: true,
              color: true,
              size: true,
              storage: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── GET SINGLE PRODUCT ───────────────────────────────────────

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        seller: { select: { id: true, businessName: true } },
        images: { orderBy: { isPrimary: 'desc' } },
        variants: { where: { isActive: true } },
        returnPolicy: true,
        productRatingSummaries: true,
        specifications: {
          include: {
            attribute: {
              include: {
                group: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  // ─── UPDATE PRODUCT ───────────────────────────────────────────

  async update(sellerId: string, productId: string, dto: UpdateProductDto) {
    await this.checkProductOwnership(sellerId, productId);

    if (dto.returnPolicyId) {
      const policy = await this.prisma.returnPolicy.findUnique({
        where: { id: dto.returnPolicyId },
      });
      if (!policy) throw new NotFoundException('Return policy not found');
      if (!policy.isActive) throw new BadRequestException('Return policy is inactive');
    }

    return this.prisma.product.update({
      where: { id: productId },
      data: dto,
      include: {
        category: { select: { id: true, name: true } },
        images: true,
        variants: true,
      },
    });
  }

  // ─── DELETE PRODUCT ───────────────────────────────────────────

  async remove(sellerId: string, productId: string) {
    await this.checkProductOwnership(sellerId, productId);

    // Check if product has orders
    const ordersCount = await this.prisma.orderItem.count({
      where: { productId },
    });

    if (ordersCount > 0) {
      throw new BadRequestException(
        'Cannot delete product with existing orders.',
      );
    }

    await this.prisma.product.delete({ where: { id: productId } });
    return { message: 'Product deleted successfully' };
  }

  // ─── PRODUCT IMAGES ───────────────────────────────────────────

  async addImage(sellerId: string, productId: string, dto: AddProductImageDto) {
    await this.checkProductOwnership(sellerId, productId);

    // Unset previous primary if new one is primary
    if (dto.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.productImage.create({
      data: { productId, ...dto },
    });
  }

  async removeImage(sellerId: string, productId: string, imageId: string) {
    await this.checkProductOwnership(sellerId, productId);

    const image = await this.prisma.productImage.findUnique({
      where: { id: imageId },
    });

    if (!image) throw new NotFoundException('Image not found');
    if (image.productId !== productId) {
      throw new ForbiddenException('Image does not belong to this product');
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { message: 'Image deleted successfully' };
  }

  // ─── PRODUCT VARIANTS ─────────────────────────────────────────

  async createVariant(
    sellerId: string,
    productId: string,
    dto: CreateVariantDto,
  ) {
    await this.checkProductOwnership(sellerId, productId);

    // sellingPrice must be <= mrp
    if (dto.sellingPrice > dto.mrp) {
      throw new BadRequestException('Selling price cannot be greater than MRP');
    }

    // Check sku uniqueness
    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku },
    });
    if (existingSku) throw new BadRequestException('SKU already exists');

    return this.prisma.productVariant.create({
      data: { productId, ...dto },
    });
  }

  async updateVariant(
    sellerId: string,
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    await this.checkProductOwnership(sellerId, productId);

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.productId !== productId) {
      throw new ForbiddenException('Variant does not belong to this product');
    }

    // Validate sellingPrice <= mrp
    const newMrp = dto.mrp ?? variant.mrp;
    const newSellingPrice = dto.sellingPrice ?? variant.sellingPrice;
    if (Number(newSellingPrice) > Number(newMrp)) {
      throw new BadRequestException('Selling price cannot be greater than MRP');
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: dto,
    });
  }

  async removeVariant(
    sellerId: string,
    productId: string,
    variantId: string,
  ) {
    await this.checkProductOwnership(sellerId, productId);

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.productId !== productId) {
      throw new ForbiddenException('Variant does not belong to this product');
    }

    // Check if variant has orders
    const ordersCount = await this.prisma.orderItem.count({
      where: { variantId },
    });

    if (ordersCount > 0) {
      throw new BadRequestException(
        'Cannot delete variant with existing orders.',
      );
    }

    await this.prisma.productVariant.delete({ where: { id: variantId } });
    return { message: 'Variant deleted successfully' };
  }

  // ─── PRODUCT SPECIFICATIONS ───────────────────────────────────

  async fillSpecifications(
    sellerId: string,
    productId: string,
    dto: FillSpecificationsDto,
  ) {
    const product = await this.checkProductOwnership(sellerId, productId);

    // Get all attributes for this product's category (with inheritance)
    const categoryAttributes = await this.prisma.categoryAttribute.findMany({
      where: {
        categoryId: {
          in: await this.getCategoryAndAncestorIds(product.categoryId),
        },
      },
      include: {
        attribute: true,
      },
    });

    // Check all required attributes are filled
    const requiredAttributes = categoryAttributes.filter((ca) => ca.isRequired);
    const submittedAttributeIds = dto.specifications.map((s) => s.attributeId);

    const missingRequired = requiredAttributes.filter(
      (ca) => !submittedAttributeIds.includes(ca.attributeId),
    );

    if (missingRequired.length > 0) {
      throw new BadRequestException(
        `Missing required attributes: ${missingRequired
          .map((ca) => ca.attribute.name)
          .join(', ')}`,
      );
    }

    // Validate each value matches attribute dataType
    for (const spec of dto.specifications) {
      const categoryAttr = categoryAttributes.find(
        (ca) => ca.attributeId === spec.attributeId,
      );

      if (!categoryAttr) {
        throw new BadRequestException(
          `Attribute ${spec.attributeId} is not valid for this category`,
        );
      }

      const { dataType } = categoryAttr.attribute;

      if (dataType === 'TEXT' && spec.valueText === undefined) {
        throw new BadRequestException(
          `Attribute "${categoryAttr.attribute.name}" expects a TEXT value`,
        );
      }
      if (dataType === 'NUMBER' && spec.valueNumber === undefined) {
        throw new BadRequestException(
          `Attribute "${categoryAttr.attribute.name}" expects a NUMBER value`,
        );
      }
      if (dataType === 'BOOLEAN' && spec.valueBoolean === undefined) {
        throw new BadRequestException(
          `Attribute "${categoryAttr.attribute.name}" expects a BOOLEAN value`,
        );
      }
    }

    // Upsert all specifications
    const upsertPromises = dto.specifications.map((spec) =>
      this.prisma.productSpecification.upsert({
        where: {
          productId_attributeId: {
            productId,
            attributeId: spec.attributeId,
          },
        },
        update: {
          valueText: spec.valueText,
          valueNumber: spec.valueNumber,
          valueBoolean: spec.valueBoolean,
        },
        create: {
          productId,
          attributeId: spec.attributeId,
          valueText: spec.valueText,
          valueNumber: spec.valueNumber,
          valueBoolean: spec.valueBoolean,
        },
      }),
    );

    await Promise.all(upsertPromises);
    return { message: 'Specifications saved successfully' };
  }

  async getSpecifications(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.productSpecification.findMany({
      where: { productId },
      include: {
        attribute: {
          include: {
            group: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  private async checkProductOwnership(sellerId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) throw new NotFoundException('Product not found');
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException('You do not own this product');
    }

    return product;
  }

  private async getSubcategoryIds(categoryId: string): Promise<string[]> {
    const subcategories = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    const ids = subcategories.map((c) => c.id);

    // Recursively get deeper subcategories
    for (const id of ids) {
      const deeperIds = await this.getSubcategoryIds(id);
      ids.push(...deeperIds);
    }

    return ids;
  }

  private async getCategoryAndAncestorIds(categoryId: string): Promise<string[]> {
    const ids: string[] = [categoryId];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!category || !category.parentId) break;
      ids.push(category.parentId);
      currentId = category.parentId;
    }

    return ids;
  }
}