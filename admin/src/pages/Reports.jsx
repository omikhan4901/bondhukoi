import { useState } from 'react';
import { Segmented, Card, Tag, Input, Button, Space, Empty, Skeleton } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api, fmtDate } from '../lib';
import { UserDrawer } from './Users';

const REASONS = {
  harassment: 'Harassing or bullying',
  stalking: 'Following or watching',
  fake_account: 'Fake account',
  inappropriate: 'Inappropriate name or photo',
  spam: 'Spam',
  other: 'Something else',
};

function Report({ report, onOpenUser }) {
  const [note, setNote] = useState(report.adminNote);
  const save = useChange((body) => api(`/api/admin/reports/${report.id}`, { method: 'PATCH', body }), { success: 'Saved.' });
  const urgent = report.reason === 'stalking' || report.reason === 'harassment';
  return (
    <Card size="small" styles={{ body: { padding: 20 } }}>
      <div className="flex flex-wrap justify-between gap-2">
        <Space>
          <Tag color={urgent ? 'red' : 'default'} bordered={false}>
            {REASONS[report.reason]}
          </Tag>
          <Tag bordered={false}>{report.status}</Tag>
        </Space>
        <span className="text-slate-400 text-sm">{fmtDate(report.createdAt)}</span>
      </div>
      <div className="mt-3 text-sm">
        {report.reporter ? (
          <a onClick={() => onOpenUser(report.reporter.id)}>{report.reporter.name}</a>
        ) : (
          'A deleted account'
        )}{' '}
        reported{' '}
        {report.targetUser ? <a onClick={() => onOpenUser(report.targetUser.id)}>{report.targetUser.name}</a> : null}
        {report.targetCircle ? <span>the circle “{report.targetCircle.name}”</span> : null}
        {!report.targetUser && !report.targetCircle ? 'someone who has since left' : null}
      </div>
      {report.details ? <p className="mt-2 mb-0 text-slate-600 whitespace-pre-wrap">“{report.details}”</p> : null}
      <Input.TextArea className="mt-3" rows={2} maxLength={2000} placeholder="Notes for other admins (never shown to users)" value={note} onChange={(e) => setNote(e.target.value)} />
      <Space className="mt-3" wrap>
        {report.status !== 'reviewing' ? <Button onClick={() => save.mutate({ status: 'reviewing', adminNote: note })}>Looking into it</Button> : null}
        {report.status !== 'closed' ? (
          <Button type="primary" onClick={() => save.mutate({ status: 'closed', adminNote: note })}>
            Close
          </Button>
        ) : (
          <Button onClick={() => save.mutate({ status: 'new', adminNote: note })}>Reopen</Button>
        )}
        {note !== report.adminNote ? <Button type="link" onClick={() => save.mutate({ adminNote: note })}>Save note</Button> : null}
      </Space>
    </Card>
  );
}

export default function Reports({ admin }) {
  const [status, setStatus] = useState('new');
  const [open, setOpen] = useState(null);
  const { data, isLoading } = useAdmin(`/reports${status === 'all' ? '' : `?status=${status}`}`);
  return (
    <div className="space-y-4">
      <Segmented value={status} onChange={setStatus} options={[{ value: 'new', label: 'New' }, { value: 'reviewing', label: 'Looking into' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
      {isLoading ? (
        <Skeleton active />
      ) : data.reports.length ? (
        <div className="space-y-3">
          {data.reports.map((r) => (
            <Report key={r.id} report={r} onOpenUser={setOpen} />
          ))}
        </div>
      ) : (
        <Empty description="Nothing here" />
      )}
      <p className="text-xs text-slate-400">Stalking and harassment reports first: suspend from the person’s page if they’re a risk.</p>
      <UserDrawer userId={open} onClose={() => setOpen(null)} admin={admin} />
    </div>
  );
}
