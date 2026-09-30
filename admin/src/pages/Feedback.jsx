import { useState } from 'react';
import { Table, Segmented, Select } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api, fmtDate } from '../lib';

export default function Feedback() {
  const [status, setStatus] = useState('new');
  const { data, isLoading } = useAdmin(`/feedback${status === 'all' ? '' : `?status=${status}`}`);
  const set = useChange(({ id, value }) => api(`/api/admin/feedback/${id}`, { method: 'PATCH', body: { status: value } }));
  return (
    <div className="space-y-4">
      <Segmented value={status} onChange={setStatus} options={[{ value: 'new', label: 'New' }, { value: 'seen', label: 'Seen' }, { value: 'done', label: 'Done' }, { value: 'all', label: 'All' }]} />
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.feedback}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        columns={[
          { title: 'Message', dataIndex: 'message', render: (m) => <div className="whitespace-pre-wrap max-w-xl">{m}</div> },
          { title: 'From', dataIndex: 'user', render: (u) => (u ? <div><div>{u.name}</div><a className="text-xs" href={`mailto:${u.email}`}>{u.email}</a></div> : '—'), responsive: ['md'] },
          { title: 'App', render: (_, r) => <span className="text-slate-500 text-xs">{[r.appVersion, r.platform, r.screen].filter(Boolean).join(' · ')}</span>, responsive: ['lg'] },
          { title: 'When', dataIndex: 'createdAt', render: fmtDate, responsive: ['md'] },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (s, r) => <Select size="small" value={s} style={{ width: 96 }} onChange={(value) => set.mutate({ id: r.id, value })} options={['new', 'seen', 'done'].map((v) => ({ value: v, label: v }))} />,
          },
        ]}
      />
    </div>
  );
}
