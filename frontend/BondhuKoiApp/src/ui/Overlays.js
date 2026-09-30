import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';
import { Button } from './Button';

/**
 * A bottom sheet that never fills the screen (85% at most) and scrolls inside.
 * `footer` stays pinned under the scrolling content.
 */
export function Sheet({ visible, onClose, title, subtitle, children, footer }) {
  const { c, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: c.overlay }} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={{
            maxHeight: height * 0.85,
            backgroundColor: c.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            paddingBottom: Math.max(insets.bottom, space.lg),
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: c.line }} />
          </View>
          {title ? (
            <View style={{ paddingHorizontal: space.xl, paddingTop: space.lg, gap: 4 }}>
              <Text variant="title">{title}</Text>
              {subtitle ? (
                <Text variant="secondary" tone="muted">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: space.lg, gap: space.md }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: space.xl, gap: space.sm }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** A small centred question with a confirm and a cancel button. */
export function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }) {
  const { c, radius, space } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl }}>
        <View style={{ width: '100%', maxWidth: 400, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.xl, gap: space.md }}>
          <Text variant="title">{title}</Text>
          {message ? (
            <Text variant="body" tone="muted">
              {message}
            </Text>
          ) : null}
          <View style={{ gap: space.sm, marginTop: space.sm }}>
            <Button title={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} loading={loading} />
            <Button title="Cancel" variant="ghost" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Makes ConfirmDialog one line to use: const confirm = useConfirm(); await confirm({...}). */
export function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);
  const dialog = state ? (
    <ConfirmDialog
      visible
      {...state}
      onConfirm={() => {
        state.resolve(true);
        setState(null);
      }}
      onCancel={() => {
        state.resolve(false);
        setState(null);
      }}
    />
  ) : null;
  return [confirm, dialog];
}

// ─── Toasts ────────────────────────────────────────────────────────────────

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const { c, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(null);

  const show = useCallback(
    (message, tone = 'info') => {
      clearTimeout(timer.current);
      setToast({ message, tone });
      AccessibilityInfo.announceForAccessibility?.(message);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setToast(null));
      }, 2600);
    },
    [opacity],
  );
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: space.lg,
            right: space.lg,
            bottom: insets.bottom + 88,
            opacity,
            backgroundColor: toast.tone === 'error' ? c.danger : c.ink,
            borderRadius: radius.sm,
            paddingVertical: 12,
            paddingHorizontal: space.lg,
          }}
        >
          <Text variant="secondaryStrong" style={{ color: c.page }}>
            {toast.message}
          </Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

/** toast('Saved') or toast('Couldn’t save', 'error') */
export const useToast = () => useContext(ToastContext);
