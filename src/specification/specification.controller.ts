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
import { SpecificationService } from './specification.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { RolesGuard } from '../admin/guards/roles.guard';
import { Roles } from '../admin/decorators/roles.decorator';
import { AdminRole } from '@prisma/client';

@Controller('specification')
export class SpecificationController {
  constructor(private specificationService: SpecificationService) {}

  // ─── GROUPS ──────────────────────────────────────────────────

  // POST /specification/groups
  @Post('groups')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  createGroup(@Body() dto: CreateGroupDto) {
    return this.specificationService.createGroup(dto);
  }

  // GET /specification/groups
  @Get('groups')
  findAllGroups() {
    return this.specificationService.findAllGroups();
  }

  // GET /specification/groups/:id
  @Get('groups/:id')
  findOneGroup(@Param('id') id: string) {
    return this.specificationService.findOneGroup(id);
  }

  // PATCH /specification/groups/:id
  @Patch('groups/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  updateGroup(
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.specificationService.updateGroup(id, dto);
  }

  // DELETE /specification/groups/:id
  @Delete('groups/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  removeGroup(@Param('id') id: string) {
    return this.specificationService.removeGroup(id);
  }

  // ─── ATTRIBUTES ───────────────────────────────────────────────

  // POST /specification/groups/:groupId/attributes
  @Post('groups/:groupId/attributes')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  createAttribute(
    @Param('groupId') groupId: string,
    @Body() dto: CreateAttributeDto,
  ) {
    return this.specificationService.createAttribute(groupId, dto);
  }

  // GET /specification/groups/:groupId/attributes
  @Get('groups/:groupId/attributes')
  findGroupAttributes(@Param('groupId') groupId: string) {
    return this.specificationService.findGroupAttributes(groupId);
  }

  // PATCH /specification/attributes/:id
  @Patch('attributes/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.ADMIN, AdminRole.SUPER_ADMIN)
  updateAttribute(
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    return this.specificationService.updateAttribute(id, dto);
  }

  // DELETE /specification/attributes/:id
  @Delete('attributes/:id')
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  removeAttribute(@Param('id') id: string) {
    return this.specificationService.removeAttribute(id);
  }
}