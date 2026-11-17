import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

describe('CreateCategoryDto - Validación de color HEX', () => {
  it('acepta #RRGGBB y lo normaliza a mayúsculas', async () => {
    const dto = plainToInstance(CreateCategoryDto, {
      name: 'Mascotas',
      type: 'EXPENSE',
      icon: ' #f97316 ',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.icon).toBe('#F97316');
  });

  it('rechaza formatos inválidos como red, #FFF o #GGGGGG', async () => {
    for (const invalid of ['red', '#FFF', '#GGGGGG', '123456']) {
      const dto = plainToInstance(CreateCategoryDto, {
        name: 'Mascotas',
        type: 'EXPENSE',
        icon: invalid,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    }
  });
});
