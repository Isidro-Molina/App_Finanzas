import { IsIn, IsOptional } from 'class-validator';

export class ToggleSplitPaidDto {
  @IsOptional()
  @IsIn(['ARS', 'USD', 'EUR'], {
    message: 'paidCurrency debe ser ARS, USD o EUR',
  })
  paidCurrency?: 'ARS' | 'USD' | 'EUR';
}

