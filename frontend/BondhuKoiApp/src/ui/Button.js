import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/**
 * variant: primary (one per screen), secondary, ghost, danger.
 * size: md (52 high) or sm (40 high). `icon` is a lucide component.
 */
export function Button({ title, onPress, variant = 'primary', size = 'md', icon: Icon, loading, disabled, full = true, style, accessibilityLabel }) {
  const { c, radius } = useTheme();
  const inactive = disabled || loading;
  const look = {
    primary: { bg: c.brand, pressed: c.brandPressed, fg: 'onBrand', border: c.brand },
    secondary: { bg: c.surface, pressed: c.sunken, fg: 'ink', border: c.line },
    ghost: { bg: 'transparent', pressed: c.sunken, fg: 'brand', border: 'transparent' },
    danger: { bg: c.surface, pressed: c.dangerSoft, fg: 'danger', border: c.line },
  }[variant];
  const height = size === 'sm' ? 40 : 52;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      hitSlop={size === 'sm' ? 4 : 0}
      style={({ pressed }) => [
        {
          height,
          paddingHorizontal: size === 'sm' ? 14 : 20,
          borderRadius: radius.sm,
          backgroundColor: pressed ? look.pressed : look.bg,
          borderWidth: 1,
          borderColor: look.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: inactive && !loading ? 0.5 : 1,
          alignSelf: full ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c[look.fg]} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {Icon ? <Icon size={size === 'sm' ? 16 : 18} color={c[look.fg]} strokeWidth={2.2} /> : null}
          <Text variant={size === 'sm' ? 'secondaryStrong' : 'bodyStrong'} tone={look.fg}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** A round icon-only button (header actions, the bell). */
export function IconButton({ icon: Icon, onPress, label, badge, tone = 'ink' }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? c.sunken : 'transparent',
      })}
    >
      <Icon size={22} color={c[tone]} strokeWidth={2} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: c.brand,
            borderWidth: 2,
            borderColor: c.page,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="caption" tone="onBrand" style={{ fontSize: 10, lineHeight: 12 }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
