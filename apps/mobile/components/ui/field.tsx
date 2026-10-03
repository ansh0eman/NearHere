import { useId } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { useTheme } from '@/providers/theme-provider';

type FieldProps = TextInputProps & {
  label: string;
  helper?: string;
  error?: string | null;
};

export function Field({ label, helper, error, accessibilityLabel, style, ...inputProps }: FieldProps) {
  const generatedId = useId();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const message = error || helper;
  return (
    <View style={styles.wrap}>
      <Text nativeID={`${generatedId}-label`} style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={error || helper}
        accessibilityLabelledBy={generatedId ? `${generatedId}-label` : undefined}
        placeholderTextColor={colors.subtleText}
        selectionColor={colors.accent}
        style={[styles.input, error && styles.inputError, style]}
        {...inputProps}
      />
      {message ? <Text accessibilityRole={error ? 'alert' : undefined} style={[styles.message, error && styles.error]}>{message}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
    label: { ...typeScale.label, color: colors.mutedText },
    input: { ...typeScale.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, minHeight: 52, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    inputError: { borderColor: colors.danger },
    message: { ...typeScale.secondary, color: colors.mutedText },
    error: { color: colors.danger },
  });
}
