import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GroupsService } from '../groups.service';
import { ExpensesService } from '../expenses.service';
import { BalanceService } from '../balance.service';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { AddMemberDto } from '../dto/add-member.dto';
import { SetMemberRoleDto } from '../dto/set-member-role.dto';
import { SuggestMemberDto } from '../dto/suggest-member.dto';
import { AddExpenseDto } from '../dto/add-expense.dto';

type AuthReq = { user: { userId: string } };

@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly expensesService: ExpensesService,
    private readonly balanceService: BalanceService,
  ) {}

  // ── CRUD de grupos ──────────────────────────────────────────────────────────

  /** GET /api/v1/groups — Grupos del usuario autenticado */
  @Get()
  findAll(@Request() req: AuthReq) {
    return this.groupsService.findAll(req.user.userId);
  }

  /** GET /api/v1/groups/:id */
  @Get(':id')
  findOne(@Request() req: AuthReq, @Param('id') id: string) {
    return this.groupsService.findOne(req.user.userId, id);
  }

  /** POST /api/v1/groups */
  @Post()
  create(@Request() req: AuthReq, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(req.user.userId, dto);
  }

  /** PATCH /api/v1/groups/:id — Modificar nombre/descripción/ícono (solo ADMIN) */
  @Patch(':id')
  update(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(req.user.userId, id, dto);
  }

  /** PATCH /api/v1/groups/:id/settle — Marcar el grupo como saldado (solo ADMIN) */
  @Patch(':id/settle')
  settle(@Request() req: AuthReq, @Param('id') id: string) {
    return this.groupsService.settle(req.user.userId, id);
  }

  /** DELETE /api/v1/groups/:id — Solo ADMIN */
  @Delete(':id')
  remove(@Request() req: AuthReq, @Param('id') id: string) {
    return this.groupsService.remove(req.user.userId, id);
  }

  // ── Miembros ────────────────────────────────────────────────────────────────

  /** POST /api/v1/groups/:id/members — Agregar miembro por email */
  @Post(':id/members')
  addMember(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupsService.addMember(req.user.userId, id, dto);
  }

  /** POST /api/v1/groups/:id/invitations/accept — El invitado acepta */
  @Post(':id/invitations/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(@Request() req: AuthReq, @Param('id') id: string) {
    return this.groupsService.acceptInvitation(req.user.userId, id);
  }

  /** POST /api/v1/groups/:id/invitations/reject — El invitado rechaza */
  @Post(':id/invitations/reject')
  @HttpCode(HttpStatus.OK)
  rejectInvitation(@Request() req: AuthReq, @Param('id') id: string) {
    return this.groupsService.rejectInvitation(req.user.userId, id);
  }

  /** DELETE /api/v1/groups/:id/members/:userId — Salir o expulsar miembro */
  @Delete(':id/members/:userId')
  removeMember(
    @Request() req: AuthReq,
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.groupsService.removeMember(
      req.user.userId,
      groupId,
      targetUserId,
    );
  }

  /** PATCH /api/v1/groups/:id/members/:userId/role — Promover/degradar (solo ADMIN) */
  @Patch(':id/members/:userId/role')
  setMemberRole(
    @Request() req: AuthReq,
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: SetMemberRoleDto,
  ) {
    return this.groupsService.setMemberRole(
      req.user.userId,
      groupId,
      targetUserId,
      dto.role,
    );
  }

  /** GET /api/v1/groups/:id/invitations — Invitaciones pendientes (solo ADMIN) */
  @Get(':id/invitations')
  listInvitations(@Request() req: AuthReq, @Param('id') id: string) {
    return this.groupsService.listPendingInvitations(req.user.userId, id);
  }

  /** DELETE /api/v1/groups/:id/invitations/:userId — Cancelar invitación (solo ADMIN) */
  @Delete(':id/invitations/:userId')
  cancelInvitation(
    @Request() req: AuthReq,
    @Param('id') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.groupsService.cancelInvitation(
      req.user.userId,
      groupId,
      targetUserId,
    );
  }

  /** POST /api/v1/groups/:id/suggest-member — Sugerir miembro al admin */
  @Post(':id/suggest-member')
  suggestMember(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: SuggestMemberDto,
  ) {
    return this.groupsService.suggestMember(req.user.userId, id, dto);
  }

  /** POST /api/v1/groups/:id/leave — Abandonar el grupo */
  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  leaveGroup(@Request() req: AuthReq, @Param('id') id: string) {
    return this.groupsService.leaveGroup(req.user.userId, id);
  }

  // ── Gastos del grupo ────────────────────────────────────────────────────────

  /** GET /api/v1/groups/:id/expenses */
  @Get(':id/expenses')
  getExpenses(@Request() req: AuthReq, @Param('id') id: string) {
    return this.expensesService.findAll(req.user.userId, id);
  }

  /** POST /api/v1/groups/:id/expenses */
  @Post(':id/expenses')
  addExpense(
    @Request() req: AuthReq,
    @Param('id') id: string,
    @Body() dto: AddExpenseDto,
  ) {
    return this.expensesService.addExpense(req.user.userId, id, dto);
  }

  /** DELETE /api/v1/groups/:id/expenses/:expenseId */
  @Delete(':id/expenses/:expenseId')
  removeExpense(
    @Request() req: AuthReq,
    @Param('id') groupId: string,
    @Param('expenseId') expenseId: string,
  ) {
    return this.expensesService.remove(req.user.userId, groupId, expenseId);
  }

  /** PATCH /api/v1/groups/:id/expenses/:expenseId/splits/:splitId/toggle-paid */
  @Patch(':id/expenses/:expenseId/splits/:splitId/toggle-paid')
  toggleSplitPaid(
    @Request() req: AuthReq,
    @Param('id') groupId: string,
    @Param('expenseId') expenseId: string,
    @Param('splitId') splitId: string,
  ) {
    return this.expensesService.toggleSplitPaid(
      req.user.userId,
      groupId,
      expenseId,
      splitId,
    );
  }

  // ── Balance y saldos ────────────────────────────────────────────────────────

  /**
   * GET /api/v1/groups/:id/balance
   * Devuelve quién le debe a quién con el mínimo de transferencias.
   */
  @Get(':id/balance')
  getBalance(@Request() req: AuthReq, @Param('id') id: string) {
    return this.balanceService.getBalance(req.user.userId, id);
  }
}
