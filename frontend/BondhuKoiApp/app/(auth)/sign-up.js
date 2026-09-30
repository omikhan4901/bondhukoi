import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Input, Button, Text } from '../../src/ui';
import { useAuth } from '../../src/auth/AuthProvider';
import { useConfig } from '../../src/lib/queries';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function SignUp() {
  const { space } = useTheme();
  const { signUp } = useAuth();
  const { data: cfg } = useConfig();
  const [form, setForm] = useState({ name: '', email: '', password: '', inviteCode: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const next = {};
    if (!form.name.trim()) next.name = 'Enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter your university email.';
    if (form.password.length < 10 || !/[a-z]/i.test(form.password) || !/\d/.test(form.password)) {
      next.password = 'At least 10 characters, with letters and numbers.';
    }
    if (cfg?.invitesRequired && !form.inviteCode.trim()) next.inviteCode = 'Enter your invite code.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      await signUp({ ...form, email });
      router.push({ pathname: '/verify', params: { email } });
    } catch (err) {
      const field = { domain: 'email', invite: 'inviteCode' }[err.code];
      setErrors(field ? { [field]: err.message } : { form: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen footer={<Button title="Create account" onPress={submit} loading={busy} />}>
      <Header back title="Create your account" subtitle="Use your university email. We’ll send you a code to confirm it." />
      <View style={{ gap: space.lg }}>
        <Input label="Your name" value={form.name} onChangeText={set('name')} error={errors.name} autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
        <Input
          ref={emailRef}
          label="University email"
          placeholder="you@northsouth.edu"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Input
          ref={passwordRef}
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          hint="At least 10 characters, with letters and numbers."
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType={cfg?.invitesRequired ? 'next' : 'done'}
          onSubmitEditing={cfg?.invitesRequired ? undefined : submit}
        />
        {cfg?.invitesRequired ? (
          <Input label="Invite code" placeholder="BK-XXXXXX" value={form.inviteCode} onChangeText={set('inviteCode')} error={errors.inviteCode} autoCapitalize="characters" autoCorrect={false} />
        ) : null}
        {errors.form ? (
          <Text variant="secondary" tone="danger">
            {errors.form}
          </Text>
        ) : null}
        <Text variant="caption" tone="muted">
          By creating an account you agree to the Terms and the Privacy Policy at bondhukoi.pages.dev.
        </Text>
      </View>
    </Screen>
  );
}
