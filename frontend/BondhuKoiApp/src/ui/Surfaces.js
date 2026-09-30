import { Children, Fragment } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/** A white card with a 1 px border. `padded={false}` for lists of rows. */
export function Card({ children, padded = true, onPress, style, accessibilityLabel }) {
  const { c, radius, space } = useTheme();
  const base = {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.line,
    padding: padded ? space.lg : 0,
    overflow: 'hidden',
  };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && { backgroundColor: c.sunken }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Rows inside a card, separated by an inset hairline. */
export function RowGroup({ children }) {
  const { c } = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <Card padded={false}>
      {items.map((child, i) => (
        <Fragment key={child.key ?? i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: c.line, marginLeft: 16 }} /> : null}
          {child}
        </Fragment>
      ))}
    </Card>
  );
}

/** A small square tile with a tinted background, for icons. */
export function IconTile({ icon: Icon, tone = 'brand', size = 40 }) {
  const { c, radius } = useTheme();
  const bg = { brand: c.brandSoft, here: c.hereSoft, paused: c.pausedSoft, danger: c.dangerSoft, muted: c.sunken }[tone];
  const border = { brand: c.brandLine, here: c.hereSoft, paused: c.pausedSoft, danger: c.dangerSoft, muted: c.line }[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size >= 56 ? radius.md : radius.sm,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon size={Math.round(size * 0.48)} color={c[tone === 'muted' ? 'muted' : tone]} strokeWidth={2} />
    </View>
  );
}

/** A section label with an optional action on the right. */
export function Section({ title, action, onAction, children, style }) {
  const { space } = useTheme();
  return (
    <View style={[{ marginTop: space.xl }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm, minHeight: 24 }}>
        <Text variant="secondaryStrong" tone="muted">
          {title}
        </Text>
        {action ? (
          <Text variant="secondaryStrong" tone="brand" onPress={onAction} accessibilityRole="button" suppressHighlighting>
            {action}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A big number with a label under it. */
export function Stat({ value, label }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="stat">{value}</Text>
      <Text variant="secondary" tone="muted">
        {label}
      </Text>
    </View>
  );
}

/** A thin info or warning strip (admin banner, offline, maintenance). */
export function Banner({ text, tone = 'info', icon: Icon }) {
  const { c, radius, space } = useTheme();
  const bg = tone === 'warning' ? c.pausedSoft : c.brandSoft;
  const fg = tone === 'warning' ? 'paused' : 'brand';
  return (
    <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', backgroundColor: bg, borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: space.md }}>
      {Icon ? <Icon size={16} color={c[fg]} /> : null}
      <Text variant="secondaryStrong" tone={fg} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}
