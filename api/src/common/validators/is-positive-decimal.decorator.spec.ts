import { validate } from 'class-validator';
import { IsPositiveDecimal } from './is-positive-decimal.decorator';

class TestAmountDto {
  @IsPositiveDecimal()
  amount: string;

  constructor(amount: any) {
    this.amount = amount;
  }
}

describe('IsPositiveDecimal Validator', () => {
  it('debe aceptar números enteros y decimales válidos positivos', async () => {
    const validAmounts = ['10', '10.5', '10.50', '0.01', '999999.99', '1'];

    for (const val of validAmounts) {
      const dto = new TestAmountDto(val);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    }
  });

  it('debe rechazar cero y cero con decimales', async () => {
    const zeroAmounts = ['0', '0.0', '0.00'];

    for (const val of zeroAmounts) {
      const dto = new TestAmountDto(val);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('debe rechazar números negativos', async () => {
    const negativeAmounts = ['-1', '-0.01', '-50.25'];

    for (const val of negativeAmounts) {
      const dto = new TestAmountDto(val);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('debe rechazar más de 2 decimales', async () => {
    const invalidDecimals = ['10.555', '1.0001', '0.001'];

    for (const val of invalidDecimals) {
      const dto = new TestAmountDto(val);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });

  it('debe rechazar strings no numéricos o tipos no string', async () => {
    const invalidInputs = ['abc', '10a', '', ' ', 100, null, undefined];

    for (const val of invalidInputs) {
      const dto = new TestAmountDto(val);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});
