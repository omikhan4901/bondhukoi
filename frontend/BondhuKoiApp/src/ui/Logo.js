import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

/** The mark: two friends inside a zone edge, on a koi-orange tile. */
export function LogoMark({ size = 36 }) {
  const { c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityLabel="BondhuKoi">
      <Rect width="40" height="40" rx="11" fill={c.brand} />
      <Path d="M20 9.5c6.4 0 11 4.6 11 10.5S26.4 30.5 20 30.5 9 25.9 9 20 13.6 9.5 20 9.5Z" stroke={c.onBrand} strokeWidth="2" strokeDasharray="3.2 2.6" fill="none" opacity="0.9" />
      <Circle cx="16.5" cy="18" r="3.2" fill={c.onBrand} />
      <Circle cx="23.5" cy="18" r="3.2" fill={c.onBrand} />
      <Path d="M11.8 26.4c1-2.6 2.8-4 4.7-4s3.2 1 3.5 2.4c.3-1.4 1.6-2.4 3.5-2.4s3.7 1.4 4.7 4" stroke={c.onBrand} strokeWidth="2.2" strokeLinecap="round" fill="none" />
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
