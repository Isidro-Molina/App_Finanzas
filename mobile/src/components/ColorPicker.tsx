import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  PanResponder,
} from 'react-native';
import Svg, {
  Path,
  Circle,
  Defs,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { CATEGORY_PRESET_COLORS } from '../utils/categoryColors';
import {
  HsvColor,
  getContrastRatio,
  hexToRgb,
  hsvToRgb,
  isValidHex,
  normalizeHex,
  rgbToHex,
  rgbToHsv,
} from '../utils/color';

const WHEEL_SIZE = 168;
const WHEEL_RADIUS = WHEEL_SIZE / 2;
const HUE_SEGMENTS = 36;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function buildWedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M', cx, cy,
    'L', start.x, start.y,
    'A', r, r, 0, largeArcFlag, 0, end.x, end.y,
    'Z',
  ].join(' ');
}

const MiniRainbowWheel: React.FC<{ size?: number }> = ({ size = 36 }) => {
  const r = size / 2;
  const wedges = useMemo(() => {
    const arr: Array<{ d: string; color: string }> = [];
    const step = 360 / 12;
    for (let i = 0; i < 12; i++) {
      const hue = i * step;
      arr.push({
        d: buildWedgePath(r, r, r, hue, hue + step + 1),
        color: `hsl(${hue}, 90%, 55%)`,
      });
    }
    return arr;
  }, [r]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {wedges.map((w, idx) => (
        <Path key={idx} d={w.d} fill={w.color} />
      ))}
      <Circle cx={r} cy={r} r={r * 0.28} fill="#FFFFFF" />
    </Svg>
  );
};

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { colors, isDark } = useTheme();
  const isPreset = CATEGORY_PRESET_COLORS.includes(value.toUpperCase());

  const [showCustom, setShowCustom] = useState(!isPreset);
  const [hsv, setHsv] = useState<HsvColor>(() => {
    const rgb = hexToRgb(value);
    return rgb ? rgbToHsv(rgb) : { h: 221, s: 0.84, v: 0.92 };
  });
  const [hexInput, setHexInput] = useState(value.toUpperCase());
  const [sliderWidth, setSliderWidth] = useState(240);

  // Sincronizar cuando el padre cambia value (ej: al abrir editar otra categoria)
  useEffect(() => {
    const norm = normalizeHex(value);
    if (isValidHex(norm)) {
      setHexInput(norm);
      const rgb = hexToRgb(norm);
      if (rgb) setHsv(rgbToHsv(rgb));
    }
  }, [value]);

  const applyHsv = (next: HsvColor) => {
    setHsv(next);
    const hex = rgbToHex(hsvToRgb(next));
    setHexInput(hex);
    onChange(hex);
  };

  const applyRgbChannel = (channel: 'r' | 'g' | 'b', raw: string) => {
    const num = Math.max(0, Math.min(255, parseInt(raw.replace(/[^0-9]/g, ''), 10) || 0));
    const currentRgb = hexToRgb(value) ?? { r: 37, g: 99, b: 235 };
    const nextRgb = { ...currentRgb, [channel]: num };
    const hex = rgbToHex(nextRgb);
    setHexInput(hex);
    setHsv(rgbToHsv(nextRgb));
    onChange(hex);
  };

  const handleHexChange = (raw: string) => {
    const cleaned = raw.toUpperCase().replace(/[^#0-9A-F]/g, '').slice(0, 7);
    const withHash = cleaned.startsWith('#') ? cleaned : `#${cleaned.replace(/#/g, '')}`;
    setHexInput(withHash);
    if (isValidHex(withHash)) {
      const rgb = hexToRgb(withHash);
      if (rgb) setHsv(rgbToHsv(rgb));
      onChange(withHash);
    }
  };

  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;

  const updateWheelFromPoint = (x: number, y: number) => {
    const dx = x - WHEEL_RADIUS;
    const dy = y - WHEEL_RADIUS;
    const dist = Math.min(WHEEL_RADIUS, Math.sqrt(dx * dx + dy * dy));
    const s = dist / WHEEL_RADIUS;
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;
    applyHsv({ h: angle, s, v: hsvRef.current.v });
  };

  const wheelPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          updateWheelFromPoint(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
        onPanResponderMove: (evt) => {
          updateWheelFromPoint(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
        },
      }),
    [disabled],
  );

  const sliderWidthRef = useRef(sliderWidth);
  sliderWidthRef.current = sliderWidth;

  const updateBrightnessFromX = (x: number) => {
    const w = Math.max(1, sliderWidthRef.current);
    const v = Math.max(0.05, Math.min(1, x / w));
    applyHsv({ h: hsvRef.current.h, s: hsvRef.current.s, v });
  };

  const brightnessPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabled,
        onMoveShouldSetPanResponder: () => !disabled,
        onPanResponderGrant: (evt) => {
          updateBrightnessFromX(evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateBrightnessFromX(evt.nativeEvent.locationX);
        },
      }),
    [disabled],
  );

  const wheelWedges = useMemo(() => {
    const arr: Array<{ d: string; color: string }> = [];
    const step = 360 / HUE_SEGMENTS;
    for (let i = 0; i < HUE_SEGMENTS; i++) {
      const hue = i * step;
      arr.push({
        d: buildWedgePath(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_RADIUS, hue, hue + step + 1.5),
        color: `hsl(${hue}, 100%, 50%)`,
      });
    }
    return arr;
  }, []);

  const thumbPos = polarToCartesian(
    WHEEL_RADIUS,
    WHEEL_RADIUS,
    hsv.s * (WHEEL_RADIUS - 6),
    hsv.h,
  );
  const fullBrightnessHex = rgbToHex(hsvToRgb({ h: hsv.h, s: hsv.s, v: 1 }));
  const currentRgb = hexToRgb(value) ?? { r: 37, g: 99, b: 235 };
  const lowContrast = getContrastRatio(value, colors.bgCard) < 2.2;

  return (
    <View style={{ gap: 14 }}>
      {/* Colores rapidos (8) + boton rueda multicolor */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {CATEGORY_PRESET_COLORS.map((color) => {
          const selected = value.toUpperCase() === color;
          return (
            <TouchableOpacity
              key={color}
              disabled={disabled}
              onPress={() => {
                onChange(color);
                setShowCustom(false);
              }}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: color,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: selected ? 3 : 0,
                borderColor: '#FFFFFF',
                shadowColor: color,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selected ? 0.5 : 0,
                shadowRadius: 6,
                elevation: selected ? 3 : 0,
              }}
            >
              {selected ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          disabled={disabled}
          onPress={() => setShowCustom((prev) => !prev)}
          accessibilityLabel="Color personalizado"
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: showCustom || !isPreset ? 2.5 : 1,
            borderColor: showCustom || !isPreset ? colors.brand : colors.border,
          }}
        >
          <MiniRainbowWheel size={36} />
        </TouchableOpacity>
      </View>

      {showCustom ? (
        <View
          style={{
            backgroundColor: colors.bgInput,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 14,
          }}
        >
          {/* Rueda HSV */}
          <View style={{ alignItems: 'center' }}>
            <View
              {...wheelPan.panHandlers}
              style={{
                width: WHEEL_SIZE,
                height: WHEEL_SIZE,
                borderRadius: WHEEL_RADIUS,
                overflow: 'hidden',
              }}
            >
              <Svg width={WHEEL_SIZE} height={WHEEL_SIZE}>
                <Defs>
                  <RadialGradient id="satGrad" cx="50%" cy="50%" r="50%">
                    <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                {wheelWedges.map((w, idx) => (
                  <Path key={idx} d={w.d} fill={w.color} />
                ))}
                <Circle
                  cx={WHEEL_RADIUS}
                  cy={WHEEL_RADIUS}
                  r={WHEEL_RADIUS}
                  fill="url(#satGrad)"
                />
                {hsv.v < 1 ? (
                  <Circle
                    cx={WHEEL_RADIUS}
                    cy={WHEEL_RADIUS}
                    r={WHEEL_RADIUS}
                    fill="#000000"
                    fillOpacity={1 - hsv.v}
                  />
                ) : null}
                <Circle
                  cx={thumbPos.x}
                  cy={thumbPos.y}
                  r={9}
                  fill={value}
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />
              </Svg>
            </View>
          </View>

          {/* Slider de brillo */}
          <View>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted, marginBottom: 6 }}>
              Brillo
            </Text>
            <View
              onLayout={(e) => setSliderWidth(e.nativeEvent.layout.width)}
              {...brightnessPan.panHandlers}
              style={{ height: 24, justifyContent: 'center' }}
            >
              <LinearGradient
                colors={['#000000', fullBrightnessHex]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{ height: 14, borderRadius: 7, borderWidth: 1, borderColor: colors.border }}
              />
              <View
                style={{
                  position: 'absolute',
                  left: Math.max(0, Math.min(sliderWidth - 20, hsv.v * sliderWidth - 10)),
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: value,
                  borderWidth: 2.5,
                  borderColor: '#FFFFFF',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              />
            </View>
          </View>

          {/* Inputs HEX y RGB sincronizados */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1.5 }}>
              <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                HEX
              </Text>
              <TextInput
                value={hexInput}
                onChangeText={handleHexChange}
                editable={!disabled}
                autoCapitalize="characters"
                maxLength={7}
                placeholder="#2563EB"
                placeholderTextColor={colors.textMuted}
                style={{
                  backgroundColor: colors.bgCard,
                  borderWidth: 1,
                  borderColor: isValidHex(hexInput) ? colors.border : '#EF4444',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 13,
                  color: colors.textPrimary,
                }}
              />
            </View>

            {(['r', 'g', 'b'] as const).map((ch) => (
              <View key={ch} style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: colors.textMuted, marginBottom: 4, textTransform: 'uppercase' }}>
                  {ch}
                </Text>
                <TextInput
                  value={String(currentRgb[ch])}
                  onChangeText={(raw) => applyRgbChannel(ch, raw)}
                  editable={!disabled}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={{
                    backgroundColor: colors.bgCard,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 8,
                    paddingVertical: 8,
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 13,
                    color: colors.textPrimary,
                    textAlign: 'center',
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {lowContrast ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: isDark ? '#422006' : '#FFFBEB',
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 8,
          }}
        >
          <AlertTriangle size={14} color="#D97706" />
          <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: isDark ? '#FDE68A' : '#92400E', flex: 1 }}>
            Este color tiene bajo contraste con el fondo actual y puede costar leerlo.
          </Text>
        </View>
      ) : null}
    </View>
  );
};
