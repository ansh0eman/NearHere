import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PressableProps, StyleProp, TextStyle, ViewStyle } from 'react-native';

import { colors, radii, spacing, touchTarget } from '@/constants/design-tokens';

type Variant = 'primary' | 'secondary' | 'quiet' | 'danger';

type ButtonProps = PropsWithChildren<{
  label: string;
  onPress: PressableProps['onPress'];
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}>;

const variantStyles = {
  primary: { backgroundColor: colors.accent, borderColor: colors.accent, label: colors.onAccent },
  secondary: { backgroundColor: colors.raised, borderColor: colors.border, label: colors.text },
  quiet: { backgroundColor: 'transparent', borderColor: 'transparent', label: colors.mutedText },
  danger: { backgroundColor: '#422827', borderColor: '#69403C', label: colors.danger },
} as const;

export function Button({
  label, onPress, variant = 'primary', disabled = false, loading = false,
  accessibilityLabel, icon, style, labelStyle,
}: ButtonProps) {
  const palette = variantStyles[variant];
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.base, {
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
      }, (disabled || loading) && styles.disabled, pressed && !disabled && !loading && styles.pressed, style]}>
      {loading ? <ActivityIndicator color={palette.label} /> : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={18} color={palette.label} /> : null}
          <Text style={[styles.label, { color: palette.label }, labelStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', borderRadius: radii.control, borderWidth: 1, justifyContent: 'center', minHeight: touchTarget, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  content: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700', lineHeight: 20, textAlign: 'center' },
  disabled: { opacity: 0.48 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
});
