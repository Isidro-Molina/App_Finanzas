import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface ToastProps {
  visible: boolean;
  message: string;
  icon?: React.ReactNode;
}

export const Toast: React.FC<ToastProps> = ({ visible, message, icon }) => {
  const { colors, isDark } = useTheme();

  if (!visible || !message) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: Platform.OS === 'ios' ? 96 : 84,
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: isDark ? '#1E293B' : '#0F172A',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: isDark ? colors.border : 'rgba(255,255,255,0.08)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.22,
          shadowRadius: 14,
          elevation: 8,
          maxWidth: 380,
        }}
      >
        {icon ? <View>{icon}</View> : null}
        <Text
          style={{
            fontFamily: 'Inter_500Medium',
            fontSize: 13,
            color: '#FFFFFF',
            flexShrink: 1,
          }}
        >
          {message}
        </Text>
      </View>
    </View>
  );
};
