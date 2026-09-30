import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Header, Input, Button, CodeInput, Text, useToast } from '../../src/ui';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

/**
 * Email → code and new password together. (A correct code signs you in, which switches
 * to the app, so the new password has to be set in the same step.)
 */
export default function Forgot() {
  const { space } = useTheme();
  const params = useLocalSearchParams();
  const { sendReset, verifyReset, setPassword } = useAuth();
  const toast = useToast();
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [password, setPw] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const address = email.trim().toLowerCase();

  async function run(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!sent) {
    return (
      <Screen footer={<Button title="Send code" loading={busy} onPress={() => run(async () => { await sendReset(address); setSent(true); })} />}>
        <Header back title="Reset your password" subtitle="We’ll email you a 6-digit code." />
        <Input label="University email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={error} />
      </Screen>
    );
  }

  const valid = code.length === 6 && password.length >= 10 && /[a-z]/i.test(password) && /\d/.test(password);
  return (
    <Screen
      footer={
        <Button
          title="Save new password"
          disabled={!valid}
          loading={busy}
          onPress={() =>
            run(async () => {
              await verifyReset(address, code);
              await setPassword(password);
              toast('Password changed. You’re signed in.');
            })
          }
        />
      }
    >
      <Header back title="Enter the code" subtitle={`Sent to ${address}. Then choose a new password.`} />
      <View style={{ gap: space.xl }}>
        <CodeInput value={code} onChange={setCode} />
        <Input label="New password" value={password} onChangeText={setPw} secureTextEntry autoComplete="new-password" hint="At least 10 characters, with letters and numbers." />
        {error ? (
          <Text variant="secondary" tone="danger">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}
