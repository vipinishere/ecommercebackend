import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';

@Injectable()
export class SpecificationService {
  constructor(private prisma: PrismaService) {}

  // ─── SPECIFICATION GROUPS ────────────────────────────────────

  async createGroup(dto: CreateGroupDto) {
    return this.prisma.specificationGroup.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        attributes: true,
      },
    });
  }

  async findAllGroups() {
    return this.prisma.specificationGroup.findMany({
      include: {
        attributes: {
          select: {
            id: true,
            name: true,
            dataType: true,
            description: true,
            unit: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOneGroup(id: string) {
    const group = await this.prisma.specificationGroup.findUnique({
      where: { id },
      include: {
        attributes: {
          select: {
            id: true,
            name: true,
            dataType: true,
            description: true,
            unit: true,
            createdAt: true,
          },
        },
      },
    });

    if (!group) throw new NotFoundException('Specification group not found');
    return group;
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    await this.findOneGroup(id); // existence check

    return this.prisma.specificationGroup.update({
      where: { id },
      data: dto,
      include: {
        attributes: {
          select: { id: true, name: true, dataType: true },
        },
      },
    });
  }

  async removeGroup(id: string) {
    await this.findOneGroup(id); // existence check

    // Check if group has attributes
    const attributesCount = await this.prisma.specificationAttribute.count({
      where: { groupId: id },
    });

    if (attributesCount > 0) {
      throw new BadRequestException(
        'Cannot delete group with attributes. Delete attributes first.',
      );
    }

    await this.prisma.specificationGroup.delete({ where: { id } });
    return { message: 'Specification group deleted successfully' };
  }

  // ─── SPECIFICATION ATTRIBUTES ────────────────────────────────

  async createAttribute(groupId: string, dto: CreateAttributeDto) {
    await this.findOneGroup(groupId); // existence check

    return this.prisma.specificationAttribute.create({
      data: {
        groupId,
        name: dto.name,
        dataType: dto.dataType,
        description: dto.description,
        unit: dto.unit,
      },
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async findGroupAttributes(groupId: string) {
    await this.findOneGroup(groupId); // existence check

    return this.prisma.specificationAttribute.findMany({
      where: { groupId },
      select: {
        id: true,
        name: true,
        dataType: true,
        description: true,
        unit: true,
        createdAt: true,
        group: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateAttribute(id: string, dto: UpdateAttributeDto) {
    const attribute = await this.prisma.specificationAttribute.findUnique({
      where: { id },
    });

    if (!attribute) throw new NotFoundException('Specification attribute not found');

    // Prevent dataType change if values already filled by sellers
    if (dto.dataType && dto.dataType !== attribute.dataType) {
      const existingSpecsCount = await this.prisma.productSpecification.count({
        where: { attributeId: id },
      });

      if (existingSpecsCount > 0) {
        throw new BadRequestException(
          'Cannot change dataType — attribute already has product values filled. Delete existing values first.',
        );
      }
    }

    return this.prisma.specificationAttribute.update({
      where: { id },
      data: dto,
      include: {
        group: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async removeAttribute(id: string) {
    const attribute = await this.prisma.specificationAttribute.findUnique({
      where: { id },
    });

    if (!attribute) throw new NotFoundException('Specification attribute not found');

    // Check if attribute is assigned to any category
    const categoryAttributeCount = await this.prisma.categoryAttribute.count({
      where: { attributeId: id },
    });

    if (categoryAttributeCount > 0) {
      throw new BadRequestException(
        'Cannot delete attribute assigned to categories. Remove from categories first.',
      );
    }

    // Check if attribute has product values
    const productSpecCount = await this.prisma.productSpecification.count({
      where: { attributeId: id },
    });

    if (productSpecCount > 0) {
      throw new BadRequestException(
        'Cannot delete attribute with existing product values. Delete product values first.',
      );
    }

    await this.prisma.specificationAttribute.delete({ where: { id } });
    return { message: 'Specification attribute deleted successfully' };
  }
}