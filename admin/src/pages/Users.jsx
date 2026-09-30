import { useState } from 'react';
import { Table, Input, Select, Tag, Drawer, Descriptions, Button, Space, Modal, Timeline, Empty, Skeleton, Avatar } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api, fmtDate, fmtDay } from '../lib';

const STATUS = { active: 'green', suspended: 'orange', banned: 'red' };

export function StatusTag({ status }) {
  return (
    <Tag color={STATUS[status]} bordered={false}>
      {status}
    </Tag>
  );
}

const EVENT_LABELS = {
  signed_up: 'Signed up',
  friend_request_sent: 'Sent a friend request',
  friend_added: 'Accepted a friend',
  unfriended: 'Removed a friend',
  watch_requested: 'Asked for alerts',
  watch_accepted: 'Allowed alerts',
  circle_created: 'Created a circle',
  circle_joined: 'Joined a circle',
  circle_left: 'Left a circle',
  circle_member_removed: 'Removed someone from a circle',
  circle_zone_saved: 'Saved a circle zone',
  sharing_paused: 'Paused sharing',
  sharing_resumed: 'Resumed sharing',
  blocked_someone: 'Blocked someone',
  report_sent: 'Sent a report',
  signed_out_everywhere: 'Signed out everywhere',
};

function ReasonPrompt({ title, open, onCancel, onOk, danger, busy }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title={title} open={open} onCancel={onCancel} onOk={() => onOk(reason)} okText="Confirm" okButtonProps={{ danger, loading: busy }} destroyOnHidden>
      <p className="text-slate-500">The reason goes into the audit log. The person isn’t shown it.</p>
      <Input.TextArea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Three harassment reports" />
    </Modal>
  );
}

/** Everything about one account, except where they are or were. */
export function UserDrawer({ userId, onClose, admin }) {
  const { data, isLoading } = useAdmin(`/users/${userId}`, { enabled: Boolean(userId) });
  const [prompt, setPrompt] = useState(null);
  const act = useChange(({ path, method = 'POST', body }) => api(`/api/admin/users/${userId}${path}`, { method, body }), { success: 'Done.', onSuccess: () => setPrompt(null) });
  const u = data?.user;
  const isSuper = admin.role === 'super';

  return (
    <Drawer open={Boolean(userId)} onClose={onClose} width={560} title={u ? u.name : 'Account'} destroyOnHidden>
      {isLoading || !u ? (
        <Skeleton active />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar size={56} src={u.avatarUrl} style={{ background: '#fff4ee', color: '#c2410c' }}>
              {u.name[0]}
            </Avatar>
            <div>
              <div className="font-display text-lg font-bold">{u.name}</div>
              <div className="text-slate-500">{u.email}</div>
              <Space size={4} className="mt-1">
                <StatusTag status={u.status} />
                {u.verified ? <Tag bordered={false}>verified</Tag> : <Tag color="gold" bordered={false}>not verified</Tag>}
                {u.adminRole ? <Tag color="orange" bordered={false}>{u.adminRole}</Tag> : null}
              </Space>
            </div>
          </div>

          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="University">{u.university}</Descriptions.Item>
            <Descriptions.Item label="Friend code">{u.friendCode}</Descriptions.Item>
            <Descriptions.Item label="Joined">{fmtDay(u.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="Last active">{fmtDate(u.lastActiveAt)}</Descriptions.Item>
            <Descriptions.Item label="Friends">{data.counts.friends}</Descriptions.Item>
            <Descriptions.Item label="Circles">{data.counts.circles}</Descriptions.Item>
            <Descriptions.Item label="Watching">{data.counts.watching}</Descriptions.Item>
            <Descriptions.Item label="Watched by">{data.counts.watched_by}</Descriptions.Item>
            <Descriptions.Item label="Blocked by">{data.counts.blocked_by}</Descriptions.Item>
            <Descriptions.Item label="Devices">{data.counts.devices}</Descriptions.Item>
          </Descriptions>

          <Space wrap>
            {u.status === 'active' ? (
              <Button onClick={() => setPrompt({ title: `Suspend ${u.name}?`, path: '/suspend' })}>Suspend</Button>
            ) : (
              <Button type="primary" onClick={() => setPrompt({ title: `Restore ${u.name}?`, path: '/restore' })}>
                Restore
              </Button>
            )}
            {isSuper && u.status !== 'banned' ? (
              <Button danger onClick={() => setPrompt({ title: `Ban ${u.name}?`, path: '/ban', danger: true })}>
                Ban
              </Button>
            ) : null}
            <Button onClick={() => act.mutate({ path: '/sign-out' })}>Sign out</Button>
            {u.avatarUrl ? <Button onClick={() => act.mutate({ path: '/remove-photo' })}>Remove photo</Button> : null}
            {isSuper ? (
              <Button
                danger
                type="text"
                onClick={() =>
                  Modal.confirm({
                    title: `Delete ${u.name}’s account?`,
                    content: 'Everything they own is deleted. This can’t be undone.',
                    okText: 'Delete',
                    okButtonProps: { danger: true },
                    onOk: () => act.mutateAsync({ path: '', method: 'DELETE', body: { confirm: 'DELETE' } }).then(onClose),
                  })
                }
              >
                Delete account
              </Button>
            ) : null}
          </Space>

          {data.reports.length ? (
            <div>
              <h3 className="font-semibold mb-2">Reports</h3>
              {data.reports.map((r) => (
                <div key={r.id} className="flex justify-between py-1.5 border-b border-slate-100 text-sm">
                  <span>
                    {r.madeByUser ? 'Made' : 'Received'} · {r.reason.replace('_', ' ')}
                  </span>
                  <span className="text-slate-400">
                    {r.status} · {fmtDay(r.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div>
            <h3 className="font-semibold mb-3">Timeline</h3>
            {data.timeline.length ? (
              <Timeline items={data.timeline.slice(0, 60).map((e) => ({ color: 'gray', children: <span className="text-sm">{EVENT_LABELS[e.kind] || e.kind} <span className="text-slate-400">· {fmtDate(e.at)}</span></span> }))} />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing yet" />
            )}
          </div>

          {data.adminActions.length ? (
            <div>
              <h3 className="font-semibold mb-2">Admin actions</h3>
              {data.adminActions.map((a, i) => (
                <div key={i} className="text-sm py-1 text-slate-600">
                  {a.action.replace(/_/g, ' ')} by {a.admin_name || 'someone'} · <span className="text-slate-400">{fmtDate(a.at)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <p className="text-xs text-slate-400">Where this person is or was is never shown here.</p>
        </div>
      )}
      <ReasonPrompt
        open={Boolean(prompt)}
        title={prompt?.title}
        danger={prompt?.danger}
        busy={act.isPending}
        onCancel={() => setPrompt(null)}
        onOk={(reason) => act.mutate({ path: prompt.path, body: { reason } })}
      />
    </Drawer>
  );
}

export default function Users({ admin }) {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(undefined);
  const [open, setOpen] = useState(null);
  const params = new URLSearchParams({ ...(search ? { q: search } : {}), ...(status ? { status } : {}) });
  const { data, isLoading } = useAdmin(`/users?${params}`);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input.Search placeholder="Name, email or friend code" allowClear value={q} onChange={(e) => setQ(e.target.value)} onSearch={setSearch} style={{ maxWidth: 360 }} />
        <Select
          allowClear
          placeholder="Any status"
          value={status}
          onChange={setStatus}
          style={{ width: 160 }}
          options={['active', 'suspended', 'banned'].map((s) => ({ value: s, label: s }))}
        />
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.users}
        onRow={(r) => ({ onClick: () => setOpen(r.id), style: { cursor: 'pointer' } })}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        columns={[
          { title: 'Name', dataIndex: 'name', render: (n, r) => <div><div className="font-medium">{n}</div><div className="text-slate-400 text-xs">{r.email}</div></div> },
          { title: 'University', dataIndex: 'university', responsive: ['md'] },
          { title: 'Status', dataIndex: 'status', render: (s, r) => <Space size={4}><StatusTag status={s} />{r.adminRole ? <Tag color="orange" bordered={false}>{r.adminRole}</Tag> : null}</Space> },
          { title: 'Joined', dataIndex: 'createdAt', render: fmtDay, responsive: ['lg'] },
          { title: 'Last active', dataIndex: 'lastActiveAt', render: fmtDate, responsive: ['lg'] },
        ]}
      />
      <UserDrawer userId={open} onClose={() => setOpen(null)} admin={admin} />
    </div>
  );
}
