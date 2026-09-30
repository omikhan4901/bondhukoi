import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { IconButton, Button } from './Button';
import { IconTile } from './Surfaces';

/**
 * A screen: page background, safe area, 16 px gutters, and pull-to-refresh when
 * `onRefresh` is given. `footer` is pinned to the bottom (for the screen's one action).
 */
export function Screen({ children, scroll = true, onRefresh, refreshing = false, footer, edges = ['top'], contentStyle }) {
  const { c, space } = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[{ paddingHorizontal: space.lg, paddingBottom: space.xxl * 2 }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.brand} colors={[c.brand]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, paddingHorizontal: space.lg }, contentStyle]}>{children}</View>
  );
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.page }}>
      {body}
      {footer ? <View style={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg, gap: space.sm, backgroundColor: c.page }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

/**
 * The top of a screen. Tab screens get a large title; pushed screens get a back button
 * and a smaller title. `right` holds up to two icon buttons.
 */
export function Header({ title, subtitle, back, right, large = !back }) {
  const { space } = useTheme();
  return (
    <View style={{ paddingTop: space.sm, paddingBottom: space.lg, gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, marginLeft: back ? -10 : 0 }}>
        {back ? <IconButton icon={ArrowLeft} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} /> : null}
        <Text variant={large ? 'display' : 'title'} style={{ flex: 1, marginLeft: back ? 4 : 0 }} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <View style={{ flexDirection: 'row', marginRight: -10 }}>{right}</View>
      </View>
      {subtitle ? (
        <Text variant="secondary" tone="muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/** Icon, one line, one action. Used wherever a list can be empty. */
export function EmptyState({ icon, title, message, action, onAction, secondary, onSecondary }) {
  const { space } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.lg, gap: space.md }}>
      <IconTile icon={icon} size={56} />
      <Text variant="title" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" tone="muted" align="center" style={{ maxWidth: 320 }}>
          {message}
        </Text>
      ) : null}
      {action ? (
        <View style={{ alignSelf: 'stretch', gap: space.sm, marginTop: space.sm }}>
          <Button title={action} onPress={onAction} />
          {secondary ? <Button title={secondary} variant="ghost" onPress={onSecondary} /> : null}
        </View>
      ) : null}
    </View>
  );
}

/** A soft pulsing block while something loads (still, if "reduce motion" is on). */
export function Skeleton({ height = 16, width = '100%', radius: r }) {
  const { c, radius } = useTheme();
  const opacity = useRef(new Animated.Value(0.6)).current;
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setStill).catch(() => {});
  }, []);
  useEffect(() => {
    if (still) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(opacity, { toValue: 0.6, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, still]);
  return <Animated.View style={{ height, width, borderRadius: r ?? radius.sm, backgroundColor: c.sunken, opacity }} />;
}

/** A card-shaped placeholder list. */
export function SkeletonList({ rows = 4 }) {
  const { c, radius, space } = useTheme();
  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.md, borderWidth: 1, borderColor: c.line, padding: space.lg, gap: space.lg }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Skeleton width={40} height={40} radius={20} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Shown when a request fails: what happened and a retry. */
export function ErrorState({ error, onRetry }) {
  const { space } = useTheme();
  return (
    <View style={{ paddingVertical: space.xl, gap: space.md, alignItems: 'center' }}>
      <Text variant="body" tone="muted" align="center">
        {error?.message || 'Something went wrong.'}
      </Text>
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} full={false} /> : null}
    </View>
  );
}
