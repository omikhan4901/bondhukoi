import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Header, CodeInput, Button, Text, useToast } from '../../src/ui';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';
import { markNeedsOnboarding } from '../../src/lib/onboarding';

export default function Verify() {
  const { space } = useTheme();
  const { email } = useLocalSearchParams();
  const { verifySignUp, resendSignUp } = useAuth();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(60);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(value = code) {
    if (value.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await markNeedsOnboarding();
      await verifySignUp(email, value);
      // Signed in now: the root layout switches to the app, which starts onboarding.
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      await resendSignUp(email);
      setWait(60);
      toast('New code sent.');
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  return (
    <Screen footer={<Button title="Confirm" onPress={() => submit()} loading={busy} disabled={code.length !== 6} />}>
      <Header back title="Check your email" subtitle={`We sent a 6-digit code to ${email}. It can take a minute; check Spam too.`} />
      <View style={{ gap: space.xl }}>
        <CodeInput
          value={code}
          error={error}
          onChange={(v) => {
            setCode(v);
            if (v.length === 6) submit(v);
          }}
        />
        <Text variant="secondary" tone={wait > 0 ? 'muted' : 'brand'} onPress={wait > 0 ? undefined : resend} accessibilityRole="button">
          {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </Text>
      </View>
    </Screen>
  );
}
