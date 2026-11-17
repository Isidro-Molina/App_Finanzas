import React from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Spinner } from '../Spinner';

export type DialogButtonVariant = 'primary' | 'secondary' | 'danger';

export interface AppDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  content?: React.ReactNode;
  icon?: React.ReactNode;
  iconBgColor?: string;
  primaryText?: string;
  primaryVariant?: DialogButtonVariant;
  onPrimary?: () => void;
  secondaryText?: string;
  onSecondary?: () => void;
  loading?: boolean;
  onClose?: () => void;
}

export const AppDialog: React.FC<AppDialogProps> = ({
  visible,
  title,
  message,
  content,
  icon,
  iconBgColor,
  primaryText = 'Entendido',
  primaryVariant = 'primary',
  onPrimary,
  secondaryText,
  onSecondary,
  loading = false,
  onClose,
}) => {
  const { colors, isDark } = useTheme();

  const handleBackdropPress = () => {
    if (loading) return;
    if (onClose) onClose();
    else if (onSecondary) onSecondary();
    else if (onPrimary && !secondaryText) onPrimary();
  };

  const primaryBg =
    primaryVariant === 'danger'
      ? '#EF4444'
      : primaryVariant === 'secondary'
        ? colors.bgSubtle
        : colors.brand;

  const primaryTextColor =
    primaryVariant === 'secondary' ? colors.textPrimary : '#FFFFFF';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropPress}
    >
      <Pressable
        onPress={handleBackdropPress}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.bgCard,
            borderRadius: 24,
            padding: 24,
            borderWidth: isDark ? 1 : 0,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: isDark ? 0.4 : 0.18,
            shadowRadius: 24,
            elevation: 10,
          }}
        >
          {icon ? (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: iconBgColor || colors.brandLight,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'center',
                marginBottom: 14,
              }}
            >
              {icon}
            </View>
          ) : null}

          <Text
            style={{
              fontFamily: 'Outfit_700Bold',
              fontSize: 19,
              color: colors.textPrimary,
              textAlign: icon ? 'center' : 'left',
              marginBottom: message || content ? 8 : 20,
            }}
          >
            {title}
          </Text>

          {message ? (
            <Text
              style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 14,
                lineHeight: 21,
                color: colors.textSecondary,
                textAlign: icon ? 'center' : 'left',
                marginBottom: content ? 14 : 22,
              }}
            >
              {message}
            </Text>
          ) : null}

          {content ? (
            <ScrollView
              style={{ maxHeight: 340, marginBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {content}
            </ScrollView>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {secondaryText ? (
              <TouchableOpacity
                onPress={onSecondary}
                disabled={loading}
                activeOpacity={0.75}
                style={{
                  flex: 1,
                  paddingVertical: 13,
                  borderRadius: 14,
                  backgroundColor: colors.bgSubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: colors.textPrimary,
                  }}
                >
                  {secondaryText}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={onPrimary}
              disabled={loading}
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 14,
                backgroundColor: primaryBg,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? (
                <Spinner size={16} color={primaryTextColor} />
              ) : (
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: primaryTextColor,
                  }}
                >
                  {primaryText}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
