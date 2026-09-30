import { Text as RNText } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/**
 * Text in one of the design's styles. `variant`: display, title, heading, body, bodyStrong,
 * secondary, secondaryStrong, caption, stat. `tone`: ink, muted, faint, brand, here,
 * paused, danger, onBrand.
 */
export function Text({ variant = 'body', tone = 'ink', align, style, children, ...rest }) {
  const { c, type } = useTheme();
  return (
    <RNText
      style={[type[variant], { color: c[tone] }, align && { textAlign: align }, style]}
      maxFontSizeMultiplier={1.4}
      {...rest}
    >
      {children}
    </RNText>
  );
}
