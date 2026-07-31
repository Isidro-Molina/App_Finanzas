import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CategoriesService } from '../categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';

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

  /** DELETE /api/v1/categories/:id — Solo categorías propias */
  @Delete(':id')
  remove(
    @Request() req: { user: { userId: string } },
    @Param('id') id: string,
  ) {
    return this.categoriesService.remove(req.user.userId, id);
  }
}
