import { useEffect, useState } from 'react';
import { Card, Switch, Input, Button, Select, Alert, Skeleton } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api } from '../lib';

function Row({ title, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-6 py-3 border-b border-slate-100 last:border-0">
      <div>
        <div className="font-medium">{title}</div>
        {hint ? <div className="text-slate-500 text-sm">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Section({ title, value, keyName, disabled, children }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const save = useChange((body) => api(`/api/admin/settings/${keyName}`, { method: 'PUT', body }), { success: 'Saved. The app picks it up within a minute.' });
  const dirty = JSON.stringify(draft) !== JSON.stringify(value);
  return (
    <Card title={title} extra={dirty && !disabled ? <Button type="primary" size="small" loading={save.isPending} onClick={() => save.mutate(keyName === 'minAppVersion' ? { value: draft } : draft)}>Save</Button> : null}>
      {children(draft, setDraft)}
    </Card>
  );
}

export default function Settings({ admin }) {
  const { data, isLoading } = useAdmin('/settings');
  if (isLoading) return <Skeleton active />;
  const s = data.settings;
  const ro = admin.role !== 'super';
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {ro ? <Alert className="lg:col-span-2" type="info" showIcon message="Only super admins can change settings." /> : null}
      <Section title="Sign-ups" keyName="signups" value={s.signups} disabled={ro}>
        {(d, set) => (
          <>
            <Row title="Open" hint="Off: nobody new can join.">
              <Switch disabled={ro} checked={d.open} onChange={(v) => set({ ...d, open: v })} />
            </Row>
            <Row title="Invite code required" hint="For the invite-only beta.">
              <Switch disabled={ro} checked={d.invitesRequired} onChange={(v) => set({ ...d, invitesRequired: v })} />
            </Row>
          </>
        )}
      </Section>
      <Section title="Maintenance" keyName="maintenance" value={s.maintenance} disabled={ro}>
        {(d, set) => (
          <>
            <Row title="Maintenance mode" hint="The app can read but not change anything.">
              <Switch disabled={ro} checked={d.enabled} onChange={(v) => set({ ...d, enabled: v })} />
            </Row>
            <Input disabled={ro} className="mt-3" maxLength={200} placeholder="Message, e.g. Back at 3 PM" value={d.message} onChange={(e) => set({ ...d, message: e.target.value })} />
          </>
        )}
      </Section>
      <Section title="Banner" keyName="banner" value={s.banner} disabled={ro}>
        {(d, set) => (
          <div className="space-y-3">
            <Input disabled={ro} maxLength={200} placeholder="Shown at the top of Home. Empty: no banner." value={d.text} onChange={(e) => set({ ...d, text: e.target.value })} />
            <Select disabled={ro} value={d.tone} onChange={(tone) => set({ ...d, tone })} style={{ width: 140 }} options={[{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }]} />
          </div>
        )}
      </Section>
      <Section title="Minimum app version" keyName="minAppVersion" value={s.minAppVersion} disabled={ro}>
        {(d, set) => (
          <Row title="Older versions must update" hint="Use this after a security fix.">
            <Input disabled={ro} value={d} onChange={(e) => set(e.target.value)} style={{ width: 110 }} placeholder="1.0.0" />
          </Row>
        )}
      </Section>
      <Section title="Features" keyName="features" value={s.features} disabled={ro}>
        {(d, set) => (
          <>
            <Row title="Arrival alerts (watching)" hint="Off: nobody can ask for or accept new alerts.">
              <Switch disabled={ro} checked={d.watch} onChange={(v) => set({ ...d, watch: v })} />
            </Row>
            <Row title="Circle activity (“Today”)" hint="Arrivals and departures in circles.">
              <Switch disabled={ro} checked={d.feed} onChange={(v) => set({ ...d, feed: v })} />
            </Row>
            <Row title="Google sign-in" hint="Not built yet.">
              <Switch disabled checked={d.googleSignIn} />
            </Row>
          </>
        )}
      </Section>
    </div>
  );
}
