import { Card, Progress, Skeleton, Tag, Alert } from 'antd';
import { useAdmin } from '../hooks';

function Stat({ label, value, hint, onClick }) {
  return (
    <Card size="small" hoverable={Boolean(onClick)} onClick={onClick} styles={{ body: { padding: 20 } }}>
      <div className="text-slate-500 text-sm">{label}</div>
      <div className="font-display text-3xl font-bold mt-1">{value ?? '—'}</div>
      {hint ? <div className="text-slate-400 text-xs mt-1">{hint}</div> : null}
    </Card>
  );
}

export default function Overview({ go }) {
  const { data, isLoading, error } = useAdmin('/overview', { refetchInterval: 60_000 });
  if (error) return <Alert type="error" message={error.message} showIcon />;
  if (isLoading) return <Skeleton active />;
  const t = data.totals;
  const max = Math.max(1, ...data.signupsPerDay.map((d) => d.signups));
  const dbPct = Math.round((data.freeTier.databaseBytes / data.freeTier.databaseLimitBytes) * 100);
  const mauPct = Math.round((data.freeTier.monthlyActiveUsers / data.freeTier.monthlyActiveLimit) * 100);

  return (
    <div className="space-y-6">
      {data.switches.maintenance ? <Alert type="warning" showIcon message="Maintenance mode is on: the app is read-only." /> : null}
      {!data.switches.signupsOpen ? <Alert type="info" showIcon message="Sign-ups are closed." /> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Students" value={t.users} hint={`${t.signups_today} joined today`} onClick={() => go('signups')} />
        <Stat label="Active today" value={t.active_today} hint={`${t.active_week} this week`} />
        <Stat label="Sharing on" value={t.users ? `${Math.round((t.sharing_on / t.users) * 100)}%` : '—'} hint={`${t.sharing_on} of ${t.users}`} />
        <Stat label="Open reports" value={t.open_reports} hint={`${t.new_feedback} new feedback`} onClick={() => go('reports')} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Sign-ups, last 14 days" className="lg:col-span-2">
          <div className="flex items-end gap-1.5 h-40" role="img" aria-label="Sign-ups per day">
            {data.signupsPerDay.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.signups}`}>
                <div className="text-[10px] text-slate-400">{d.signups || ''}</div>
                <div className="w-full rounded-md bg-brand" style={{ height: `${(d.signups / max) * 120 + 2}px`, opacity: d.signups ? 1 : 0.15 }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-2">
            <span>{data.signupsPerDay[0].day}</span>
            <span>today</span>
          </div>
        </Card>
        <Card title="Free tier">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm">
                <span>Database</span>
                <span className="text-slate-500">{(data.freeTier.databaseBytes / 1048576).toFixed(0)} of 500 MB</span>
              </div>
              <Progress percent={dbPct} showInfo={false} strokeColor={dbPct > 70 ? '#dc2626' : '#c2410c'} />
            </div>
            <div>
              <div className="flex justify-between text-sm">
                <span>Monthly active</span>
                <span className="text-slate-500">{data.freeTier.monthlyActiveUsers} of 50,000</span>
              </div>
              <Progress percent={mauPct} showInfo={false} strokeColor="#c2410c" />
            </div>
            <div className="text-xs text-slate-400">Upgrade to Supabase Pro ($25/month) only past about 70% of either.</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Friendships" value={t.friendships} />
        <Stat label="Circles" value={t.circles} onClick={() => go('circles')} />
        <Stat label="Active watches" value={t.watches} />
        <Stat label="Devices with push" value={t.devices} />
      </div>
      <p className="text-xs text-slate-400">
        <Tag bordered={false}>Privacy</Tag> The console never shows where anyone is or was.
      </p>
    </div>
  );
}
