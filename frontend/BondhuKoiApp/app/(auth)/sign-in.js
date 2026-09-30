import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Input, Button, Text } from '../../src/ui';
import { useAuth } from '../../src/auth/AuthProvider';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function SignIn() {
  const { space } = useTheme();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef(null);

  async function submit() {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(err.message);
      if (err.message.startsWith('Confirm your email')) router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button title="Sign in" onPress={submit} loading={busy} />}>
      <Header back title="Welcome back" />
      <View style={{ gap: space.lg }}>
        <Input
          label="University email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Input
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={submit}
          error={error}
        />
        <Text variant="secondaryStrong" tone="brand" onPress={() => router.push({ pathname: '/forgot', params: { email } })} accessibilityRole="button">
          Forgot your password?
        </Text>
      </View>
    </Screen>
  );
}
