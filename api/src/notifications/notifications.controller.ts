import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

type AuthReq = { user: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Request() req: AuthReq) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: AuthReq) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(@Request() req: AuthReq, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.userId, id);
  }

  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.notificationsService.remove(req.user.userId, id);
  }

  @Delete()
  removeAll(@Request() req: AuthReq, @Query('onlyRead') onlyRead?: string) {
    return this.notificationsService.removeAll(
      req.user.userId,
      onlyRead === 'true',
    );
  }
}
