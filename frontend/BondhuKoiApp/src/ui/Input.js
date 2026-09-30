import { forwardRef, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/** A labelled text field. Shows `error` in red under it, otherwise `hint`. */
export const Input = forwardRef(function Input({ label, hint, error, style, multiline, ...rest }, ref) {
  const { c, radius, type } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {label ? (
        <Text variant="secondaryStrong" tone="ink">
          {label}
        </Text>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={c.faint}
        selectionColor={c.brand}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        multiline={multiline}
        style={[
          type.body,
          {
            color: c.ink,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: error ? c.danger : focused ? c.brand : c.line,
            borderRadius: radius.sm,
            paddingHorizontal: 14,
            paddingVertical: multiline ? 12 : 0,
            minHeight: multiline ? 104 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
        accessibilityLabel={label}
        maxFontSizeMultiplier={1.4}
        {...rest}
      />
      {error || hint ? (
        <Text variant="secondary" tone={error ? 'danger' : 'muted'}>
          {error || hint}
        </Text>
      ) : null}
    </View>
  );
});

/** Six boxes for an email code. Pastes and autofill fill all of them. */
export function CodeInput({ value, onChange, length = 6, autoFocus = true, error }) {
  const { c, radius, fonts } = useTheme();
  const ref = useRef(null);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Code" style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
        {digits.map((d, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 56,
                maxWidth: 52,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: error ? c.danger : active ? c.brand : c.line,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: c.ink }}>{d.trim()}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={length}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      {error ? (
        <Text variant="secondary" tone="danger">
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}
