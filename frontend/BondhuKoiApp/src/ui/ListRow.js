import { Pressable, Switch, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/**
 * A row inside a RowGroup: leading element, title, optional subtitle, and a trailing
 * element (chevron when pressable, a value, a switch, or anything).
 */
export function ListRow({ leading, title, subtitle, trailing, value, onPress, tone = 'ink', chevron, accessibilityLabel, children }) {
  const { c, space } = useTheme();
  const content = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 12, minHeight: 56 }}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" tone={tone} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <Text variant="secondary" tone="muted" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : (
            subtitle
          )
        ) : null}
        {children}
      </View>
      {value ? (
        <Text variant="secondary" tone="muted">
          {value}
        </Text>
      ) : null}
      {trailing}
      {onPress && (chevron ?? !trailing) ? <ChevronRight size={18} color={c.faint} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      style={({ pressed }) => pressed && { backgroundColor: c.sunken }}
    >
      {content}
    </Pressable>
  );
}

/** A row with a switch. The whole row toggles it. */
export function SwitchRow({ title, subtitle, value, onValueChange, disabled, leading }) {
  const { c } = useTheme();
  return (
    <ListRow
      leading={leading}
      title={title}
      subtitle={subtitle}
      onPress={disabled ? undefined : () => onValueChange(!value)}
      chevron={false}
      accessibilityLabel={`${title}, ${value ? 'on' : 'off'}`}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: c.line, true: c.brand }}
          thumbColor={c.surface}
          activeThumbColor={c.surface}
          ios_backgroundColor={c.line}
        />
      }
    />
  );
}
