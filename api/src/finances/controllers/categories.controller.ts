import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CategoriesService } from '../categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** GET /api/v1/categories — Globales + personales del usuario */
  @Get()
  findAll(@Request() req: { user: { userId: string } }) {
    return this.categoriesService.findAll(req.user.userId);
  }

  /** POST /api/v1/categories — Crear categoría personal */
  @Post()
  create(
    @Request() req: { user: { userId: string } },
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(req.user.userId, dto);
  }

  /** PATCH /api/v1/categories/:id — Modificar categoría personal */
  @Patch(':id')
  update(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(req.user.userId, id, dto);
  }

  /** DELETE /api/v1/categories/:id — Solo categorías propias (soft delete) */
  @Delete(':id')
  remove(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(req.user.userId, id);
  }
}
