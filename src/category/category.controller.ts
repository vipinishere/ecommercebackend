import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { AdminRole } from '@prisma/client';

@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  // ─── ADMIN ONLY ──────────────────────────────────────────────

  // POST /category
  @Post()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // PATCH /category/:id
  @Patch(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  // DELETE /category/:id
  @Delete(':id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN) // only SUPER_ADMIN can delete
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  // POST /category/:id/attributes
  @Post(':id/attributes')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  assignAttribute(
    @Param('id') categoryId: string,
    @Body('attributeId') attributeId: string,
    @Body('isRequired') isRequired: boolean,
  ) {
    return this.categoryService.assignAttribute(
      categoryId,
      attributeId,
      isRequired,
    );
  }

  // DELETE /category/:id/attributes/:attributeId
  @Delete(':id/attributes/:attributeId')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  removeAttribute(
    @Param('id') categoryId: string,
    @Param('attributeId') attributeId: string,
  ) {
    return this.categoryService.removeAttribute(categoryId, attributeId);
  }

  // ─── PUBLIC ──────────────────────────────────────────────────

  // GET /category
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  // GET /category/:id
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  // GET /category/:id/attributes
  @Get(':id/attributes')
  getCategoryAttributes(@Param('id') categoryId: string) {
    return this.categoryService.getCategoryAttributes(categoryId);
  }
}