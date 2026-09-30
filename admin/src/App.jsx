import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Spin, Typography, Alert } from 'antd';
import { supabase, api } from './lib';
import Console from './Console';

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="32" height="32" viewBox="0 0 40 40" aria-hidden>
        <rect width="40" height="40" rx="11" fill="#c2410c" />
        <circle cx="16.5" cy="18" r="3.2" fill="#fff" />
        <circle cx="23.5" cy="18" r="3.2" fill="#fff" />
        <path d="M11.8 26.4c1-2.6 2.8-4 4.7-4s3.2 1 3.5 2.4c.3-1.4 1.6-2.4 3.5-2.4s3.7 1.4 4.7 4" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </svg>
      <span className="font-display text-xl font-bold tracking-tight">
        Bondhu<span className="text-brand">Koi</span> <span className="text-slate-400 font-sans text-sm font-medium">Admin</span>
      </span>
    </div>
  );
}

function Shell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <Logo />
        <Card>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            {title}
          </Typography.Title>
          {subtitle ? <p className="text-slate-500 -mt-2 mb-5">{subtitle}</p> : null}
          {children}
        </Card>
      </div>
    </div>
  );
}

function SignIn() {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  return (
    <Shell title="Sign in" subtitle="Admins only. You’ll need your authenticator app.">
      <Form
        layout="vertical"
        requiredMark={false}
        onFinish={async ({ email, password }) => {
          setBusy(true);
          setError(null);
          const { error: e } = await supabase.auth.signInWithPassword({ email, password });
          if (e) setError('That email and password don’t match.');
          setBusy(false);
        }}
      >
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input autoComplete="username" size="large" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]}>
          <Input.Password autoComplete="current-password" size="large" />
        </Form.Item>
        {error ? <Alert type="error" message={error} className="mb-4" showIcon /> : null}
        <Button type="primary" htmlType="submit" size="large" block loading={busy}>
          Continue
        </Button>
      </Form>
    </Shell>
  );
}

/** Enrols a TOTP factor on first sign-in, then asks for a code every time. */
function TwoFactor({ onDone }) {
  const [factor, setFactor] = useState(null);
  const [qr, setQr] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === 'verified');
      if (verified) return setFactor(verified);
      for (const f of data?.all || []) if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: enrolled, error: e } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'BondhuKoi admin' });
      if (e) return setError(e.message);
      setFactor(enrolled);
      setQr(enrolled.totp.qr_code);
    })();
  }, []);

  async function verify() {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    setBusy(false);
    if (e) return setError('That code is wrong or expired.');
    onDone();
  }

  return (
    <Shell
      title="Two-factor sign-in"
      subtitle={qr ? 'Scan this with Google Authenticator, Authy or 1Password, then enter the 6-digit code.' : 'Enter the 6-digit code from your authenticator app.'}
    >
      {qr ? <img src={qr} alt="Authenticator QR code" className="mx-auto mb-4 w-44 h-44" /> : null}
      <Input size="large" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onPressEnter={verify} placeholder="123456" autoFocus />
      {error ? <Alert type="error" message={error} className="mt-4" showIcon /> : null}
      <Button type="primary" size="large" block className="mt-4" disabled={code.length !== 6 || !factor} loading={busy} onClick={verify}>
        Verify
      </Button>
      <Button type="link" block className="mt-2" onClick={() => supabase.auth.signOut()}>
        Use another account
      </Button>
    </Shell>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [aal, setAal] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [denied, setDenied] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setAal(null);
      setAdmin(null);
      return;
    }
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => setAal(data?.currentLevel));
  }, [session]);

  useEffect(() => {
    if (aal !== 'aal2') return;
    api('/api/admin/me')
      .then(setAdmin)
      .catch((e) => setDenied(e.status === 403 ? 'This account isn’t an admin.' : e.message));
  }, [aal, session]);

  if (session === undefined) return <Spin fullscreen />;
  if (!session) return <SignIn />;
  if (aal && aal !== 'aal2') return <TwoFactor onDone={() => supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => setAal(data?.currentLevel))} />;
  if (denied) {
    return (
      <Shell title="No access" subtitle={denied}>
        <Button block onClick={() => supabase.auth.signOut().then(() => setDenied(null))}>
          Sign out
        </Button>
      </Shell>
    );
  }
  if (!admin) return <Spin fullscreen />;
  return <Console admin={admin} Logo={Logo} />;
}
