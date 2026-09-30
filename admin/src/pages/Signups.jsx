import { useState } from 'react';
import { Table, Select, Input, Tag, Tooltip } from 'antd';
import { CheckCircleFilled, MinusCircleOutlined } from '@ant-design/icons';
import { useAdmin } from '../hooks';
import { fmtDate } from '../lib';
import { StatusTag, UserDrawer } from './Users';

const STEPS = [
  ['friend', 'Added a friend'],
  ['circle', 'Joined a circle'],
  ['notifications', 'Turned on notifications'],
  ['location', 'Location checked in once'],
];

export default function Signups({ admin }) {
  const [days, setDays] = useState(30);
  const [universityId, setUniversityId] = useState(undefined);
  const [invite, setInvite] = useState('');
  const [open, setOpen] = useState(null);
  const unis = useAdmin('/universities');
  const params = new URLSearchParams({ days: String(days), ...(universityId ? { universityId } : {}), ...(invite ? { invite } : {}) });
  const { data, isLoading } = useAdmin(`/signups?${params}`);
  const rows = data?.signups || [];
  const activated = rows.filter((r) => r.steps.friend && r.steps.circle).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={days} onChange={setDays} style={{ width: 150 }} options={[7, 30, 90, 365].map((d) => ({ value: d, label: `Last ${d} days` }))} />
        <Select allowClear placeholder="Any university" value={universityId} onChange={setUniversityId} style={{ width: 200 }} options={(unis.data?.universities || []).map((u) => ({ value: u.id, label: u.shortName || u.name }))} />
        <Input.Search placeholder="Invite code" allowClear onSearch={(v) => setInvite(v.trim().toUpperCase())} style={{ width: 200 }} />
        <span className="text-slate-500 text-sm ml-auto">
          {rows.length} sign-ups · {activated} activated (a friend and a circle)
        </span>
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={rows}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        onRow={(r) => ({ onClick: () => setOpen(r.id), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'Student', dataIndex: 'name', render: (n, r) => <div><div className="font-medium">{n}</div><div className="text-slate-400 text-xs">{r.email}</div></div> },
          { title: 'University', dataIndex: 'university', responsive: ['md'] },
          { title: 'Came in by', dataIndex: 'invite', render: (i) => (i ? <Tag bordered={false}>{i}</Tag> : <span className="text-slate-400">organic</span>), responsive: ['md'] },
          {
            title: 'First steps',
            render: (_, r) => (
              <div className="flex gap-1.5">
                {STEPS.map(([k, label]) => (
                  <Tooltip key={k} title={label}>
                    {r.steps[k] ? <CheckCircleFilled style={{ color: '#16a34a' }} /> : <MinusCircleOutlined style={{ color: '#cbd5e1' }} />}
                  </Tooltip>
                ))}
              </div>
            ),
          },
          { title: 'Status', dataIndex: 'status', render: (s, r) => (r.verified ? <StatusTag status={s} /> : <Tag color="gold" bordered={false}>not verified</Tag>) },
          { title: 'Joined', dataIndex: 'createdAt', render: fmtDate, responsive: ['lg'] },
        ]}
      />
      <UserDrawer userId={open} onClose={() => setOpen(null)} admin={admin} />
    </div>
  );
}
