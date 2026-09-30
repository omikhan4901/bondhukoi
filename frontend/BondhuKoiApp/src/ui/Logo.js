import { View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/** The mark: two friends (overlapping circles) inside a zone's edge, on a koi-orange tile. */
export function LogoMark({ size = 36 }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="BondhuKoi">
      <Rect width="40" height="40" rx="11" fill={c.brand} />
      <Circle cx="20" cy="20" r="12.6" stroke={c.onBrand} strokeWidth="2.2" strokeDasharray="3.3 2.7" fill="none" />
      <Circle cx="17" cy="20" r="4.8" fill={c.onBrand} />
      <Circle cx="23" cy="20" r="4.8" fill={c.onBrand} fillOpacity={0.72} />
    </Svg>
  );
}

/** Mark + "BondhuKoi" wordmark. */
export function Logo({ size = 32 }) {
  const { c, fonts } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel="BondhuKoi">
      <LogoMark size={size} />
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.66, lineHeight: size * 0.82, color: c.ink, letterSpacing: -0.4 }}>
        Bondhu<Text style={{ fontFamily: fonts.display, fontSize: size * 0.66, color: c.brand }}>Koi</Text>
      </Text>
    </View>
  );
}
