import {
  isValidHex,
  hexToRgb,
  rgbToHex,
  rgbToHsv,
  hsvToRgb,
  getContrastRatio,
} from '../color';

describe('color utilities', () => {
  it('isValidHex valida formato #RRGGBB', () => {
    expect(isValidHex('#2563EB')).toBe(true);
    expect(isValidHex('#f97316')).toBe(true);
    expect(isValidHex('#FFF')).toBe(false);
    expect(isValidHex('red')).toBe(false);
    expect(isValidHex('#GGGGGG')).toBe(false);
  });

  it('convierte HEX <-> RGB <-> HSV en ida y vuelta', () => {
    const samples = ['#2563EB', '#F97316', '#059669', '#DB2777', '#000000', '#FFFFFF'];
    for (const hex of samples) {
      const rgb = hexToRgb(hex);
      expect(rgb).not.toBeNull();
      expect(rgbToHex(rgb!)).toBe(hex);

      const hsv = rgbToHsv(rgb!);
      const backRgb = hsvToRgb(hsv);
      expect(rgbToHex(backRgb)).toBe(hex);
    }
  });

  it('calcula getContrastRatio correctamente', () => {
    expect(getContrastRatio('#000000', '#FFFFFF')).toBe(21);
    expect(getContrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    expect(getContrastRatio('#2563EB', '#FFFFFF')).toBeGreaterThan(4.5);
  });
});
