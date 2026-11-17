import {
  formatAmountInput,
  parseAmountInput,
  formatNumberToAmountInput,
} from '../amountInput';

describe('amountInput utilities', () => {
  describe('formatAmountInput', () => {
    it('formatea miles con punto al escribir enteros', () => {
      expect(formatAmountInput('7')).toBe('7');
      expect(formatAmountInput('770')).toBe('770');
      expect(formatAmountInput('7700')).toBe('7.700');
      expect(formatAmountInput('77000')).toBe('77.000');
      expect(formatAmountInput('1234567')).toBe('1.234.567');
    });

    it('mantiene el formateo correcto al borrar digitos', () => {
      expect(formatAmountInput('77.00')).toBe('7.700');
      expect(formatAmountInput('1.23')).toBe('123');
    });

    it('soporta coma decimal hasta 2 digitos', () => {
      expect(formatAmountInput('1234,5')).toBe('1.234,5');
      expect(formatAmountInput('1234,56')).toBe('1.234,56');
      expect(formatAmountInput('1234,567')).toBe('1.234,56');
    });

    it('convierte punto final en coma decimal', () => {
      expect(formatAmountInput('77.000.')).toBe('77.000,');
      expect(formatAmountInput('50.')).toBe('50,');
    });

    it('maneja entrada vacia, solo coma y ceros a la izquierda', () => {
      expect(formatAmountInput('')).toBe('');
      expect(formatAmountInput(',')).toBe('0,');
      expect(formatAmountInput('.')).toBe('0,');
      expect(formatAmountInput('0077000')).toBe('77.000');
      expect(formatAmountInput('0,5')).toBe('0,5');
    });
  });

  describe('parseAmountInput', () => {
    it('parsea montos con separador de miles correctamente (sin confundir 77.000 con 77)', () => {
      expect(parseAmountInput('77.000')).toBe(77000);
      expect(parseAmountInput('1.234.567')).toBe(1234567);
      expect(parseAmountInput('1.234,56')).toBe(1234.56);
      expect(parseAmountInput('0,50')).toBe(0.5);
    });

    it('devuelve 0 ante entrada vacia o solo coma', () => {
      expect(parseAmountInput('')).toBe(0);
      expect(parseAmountInput(',')).toBe(0);
      expect(parseAmountInput('0,')).toBe(0);
    });

    it('conserva el valor en ida y vuelta (round-trip)', () => {
      const samples = [150, 77000, 1234567.89, 0.5, 99.9];
      for (const val of samples) {
        const formatted = formatNumberToAmountInput(val);
        expect(parseAmountInput(formatted)).toBe(val);
      }
    });
  });

  describe('formatNumberToAmountInput', () => {
    it('convierte montos del backend sin ceros decimales innecesarios', () => {
      expect(formatNumberToAmountInput('77000.00')).toBe('77.000');
      expect(formatNumberToAmountInput('1234.50')).toBe('1.234,5');
      expect(formatNumberToAmountInput(1234.56)).toBe('1.234,56');
      expect(formatNumberToAmountInput(null)).toBe('');
      expect(formatNumberToAmountInput(0)).toBe('');
    });
  });
});
