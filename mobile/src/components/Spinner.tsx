import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface SpinnerProps {
  size?: 'small' | 'large' | number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'small',
  color = '#2563EB',
  strokeWidth,
  style,
}) => {
  const rotation = useRef(new Animated.Value(0)).current;

  const pixelSize =
    typeof size === 'number' ? size : size === 'large' ? 32 : 18;
  const stroke = strokeWidth ?? (pixelSize >= 28 ? 3 : 2.3);
  const radius = (pixelSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    rotation.setValue(0);
    const anim = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 750,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        {
          width: pixelSize,
          height: pixelSize,
          transform: [{ rotate: spin }],
        },
        style,
      ]}
    >
      <Svg width={pixelSize} height={pixelSize} viewBox={`0 0 ${pixelSize} ${pixelSize}`}>
        <Circle
          cx={pixelSize / 2}
          cy={pixelSize / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.72} ${circumference * 0.28}`}
          fill="none"
        />
      </Svg>
    </Animated.View>
  );
};
