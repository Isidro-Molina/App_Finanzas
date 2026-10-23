import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Validador para asegurar que un campo de monto representado como string:
 * 1. Es un string numérico válido con hasta 2 decimales.
 * 2. No contiene signos negativos ni exponentes.
 * 3. Es estrictamente mayor a 0 (no permite 0 ni 0.00).
 * 4. No excede el límite de precisión seguro.
 */
export function IsPositiveDecimal(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveDecimal',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message:
          'El monto debe ser un número decimal positivo mayor a cero (máximo 2 decimales)',
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return false;
          if (!/^\d+(\.\d{1,2})?$/.test(value)) return false;
          const num = parseFloat(value);
          return !isNaN(num) && num > 0 && num <= 999999999999.99;
        },
      },
    });
  };
}
