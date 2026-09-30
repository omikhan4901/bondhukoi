import { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';
import { Map } from 'lucide-react-native';
import { Text, IconTile } from '../ui';
import { useTheme } from '../theme/ThemeProvider';

/** Maps don't run in the web preview; this stands in for the zone editor there. */
export const ZoneEditor = forwardRef(function ZoneEditor({ height = 380 }, ref) {
  const { c, radius, space } = useTheme();
  useImperativeHandle(ref, () => ({ snapshot: async () => null }));
  return (
    <View style={{ height, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, backgroundColor: c.sunken, alignItems: 'center', justifyContent: 'center', gap: space.md }}>
      <IconTile icon={Map} size={56} />
      <Text variant="secondary" tone="muted">
        The map works in the phone app.
      </Text>
    </View>
  );
});
