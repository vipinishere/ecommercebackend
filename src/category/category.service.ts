import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // ─── CREATE CATEGORY ─────────────────────────────────────────

  async create(dto: CreateCategoryDto) {
    // Validate parentId exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ─── GET ALL CATEGORIES (tree structure) ─────────────────────

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null }, // root categories only
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true, // 3 levels deep
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  // ─── GET SINGLE CATEGORY ─────────────────────────────────────

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  // ─── UPDATE CATEGORY ─────────────────────────────────────────

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id); // existence check

    // Validate parentId exists if provided
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });
  }

  // ─── DELETE CATEGORY ─────────────────────────────────────────

  async remove(id: string) {
    await this.findOne(id); // existence check

    // Check if category has children
    const childrenCount = await this.prisma.category.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Delete subcategories first.',
      );
    }

    // Check if category has products
    const productsCount = await this.prisma.product.count({
      where: { categoryId: id },
    });

    if (productsCount > 0) {
      throw new BadRequestException(
        'Cannot delete category with products. Move or delete products first.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Category deleted successfully' };
  }

  // ─── GET CATEGORY ATTRIBUTES (with inheritance) ───────────────

  async getCategoryAttributes(categoryId: string) {
    await this.findOne(categoryId); // existence check

    // Build ancestor chain
    const ancestorIds = await this.getAncestorIds(categoryId);

    // Fetch attributes for this category + all ancestors
    const allCategoryIds = [...ancestorIds, categoryId];

    const attributes = await this.prisma.categoryAttribute.findMany({
      where: {
        categoryId: { in: allCategoryIds },
      },
      include: {
        attribute: {
          include: {
            group: {
              select: { id: true, name: true },
            },
          },
        },
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by category for clarity
    return {
      categoryId,
      totalAttributes: attributes.length,
      attributes: attributes.map((ca) => ({
        id: ca.attribute.id,
        name: ca.attribute.name,
        dataType: ca.attribute.dataType,
        isRequired: ca.isRequired,
        inheritedFrom: ca.categoryId !== categoryId ? ca.category.name : null,
        group: ca.attribute.group,
      })),
    };
  }

  // ─── ASSIGN ATTRIBUTE TO CATEGORY ────────────────────────────

  async assignAttribute(
    categoryId: string,
    attributeId: string,
    isRequired: boolean,
  ) {
    await this.findOne(categoryId); // existence check

    const attribute = await this.prisma.specificationAttribute.findUnique({
      where: { id: attributeId },
    });
    console.log(attribute)
    if (!attribute) throw new NotFoundException('Attribute not found');

    // upsert — if already assigned, update isRequired
    return this.prisma.categoryAttribute.upsert({
      where: {
        categoryId_attributeId: { categoryId, attributeId },
      },
      update: { isRequired },
      create: { categoryId, attributeId, isRequired },
      include: {
        attribute: {
          select: { id: true, name: true, dataType: true },
        },
      },
    });
  }

  // ─── REMOVE ATTRIBUTE FROM CATEGORY ──────────────────────────

  async removeAttribute(categoryId: string, attributeId: string) {
    await this.findOne(categoryId); // existence check

    const categoryAttribute = await this.prisma.categoryAttribute.findUnique({
      where: {
        categoryId_attributeId: { categoryId, attributeId },
      },
    });

    if (!categoryAttribute) {
      throw new NotFoundException('Attribute not assigned to this category');
    }

    await this.prisma.categoryAttribute.delete({
      where: {
        categoryId_attributeId: { categoryId, attributeId },
      },
    });

    return { message: 'Attribute removed from category successfully' };
  }

  // ─── HELPER — Get all ancestor category IDs ──────────────────

  private async getAncestorIds(categoryId: string): Promise<string[]> {
    const ancestors: string[] = [];
    let currentId: string | null = categoryId;

    while (currentId) {
      const category = await this.prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!category || !category.parentId) break;

      ancestors.unshift(category.parentId); // add to front (top-down order)
      currentId = category.parentId;
    }

    return ancestors;
  }
}