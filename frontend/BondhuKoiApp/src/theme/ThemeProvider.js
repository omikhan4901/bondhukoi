import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, space, radius, type, fonts } from './tokens';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, scheme: forced }) {
  const system = useColorScheme();
  const scheme = forced || (system === 'dark' ? 'dark' : 'light');
  const value = useMemo(() => ({ scheme, c: palettes[scheme], space, radius, type, fonts }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** { scheme, c (colours), space, radius, type, fonts } */
export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside ThemeProvider');
  return theme;
}
