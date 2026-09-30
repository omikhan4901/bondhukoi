import { useState } from 'react';
import { Table, Button, Card, Form, InputNumber, Select, DatePicker, Input, Tag, Modal, Typography, Alert } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api, fmtDay } from '../lib';

export default function Invites({ admin }) {
  const { data, isLoading } = useAdmin('/invites');
  const unis = useAdmin('/universities');
  const settings = useAdmin('/settings');
  const [created, setCreated] = useState(null);
  const isSuper = admin.role === 'super';
  const create = useChange((body) => api('/api/admin/invites', { method: 'POST', body }), { onSuccess: (r) => setCreated(r.code) });
  const remove = useChange((code) => api(`/api/admin/invites/${code}`, { method: 'DELETE' }), { success: 'Deleted.' });
  const required = settings.data?.settings.signups.invitesRequired;

  return (
    <div className="space-y-6">
      <Alert
        type={required ? 'success' : 'info'}
        showIcon
        message={required ? 'Invite codes are required to sign up.' : 'Invite codes are optional right now. Turn “Invites required” on in Settings for the beta.'}
      />
      {isSuper ? (
        <Card title="New invite code">
          <Form layout="inline" onFinish={(v) => create.mutate({ maxUses: v.maxUses, ...(v.universityId ? { universityId: v.universityId } : {}), ...(v.expiresAt ? { expiresAt: v.expiresAt.toISOString() } : {}), note: v.note || '' })} initialValues={{ maxUses: 80 }} className="gap-y-3">
            <Form.Item name="maxUses" label="Places" rules={[{ required: true }]}>
              <InputNumber min={1} max={5000} />
            </Form.Item>
            <Form.Item name="universityId" label="University">
              <Select allowClear placeholder="Any" style={{ width: 160 }} options={(unis.data?.universities || []).map((u) => ({ value: u.id, label: u.shortName || u.name }))} />
            </Form.Item>
            <Form.Item name="expiresAt" label="Ends">
              <DatePicker />
            </Form.Item>
            <Form.Item name="note" label="Note">
              <Input placeholder="e.g. Beta 1, CSE club" maxLength={200} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={create.isPending}>
              Create
            </Button>
          </Form>
        </Card>
      ) : null}
      <Table
        rowKey="code"
        loading={isLoading}
        dataSource={data?.invites}
        pagination={false}
        columns={[
          { title: 'Code', dataIndex: 'code', render: (c) => <Typography.Text copyable code>{c}</Typography.Text> },
          { title: 'Used', render: (_, i) => `${i.uses} of ${i.maxUses}` },
          { title: 'University', dataIndex: 'university', render: (u) => u || 'Any' },
          { title: 'Ends', dataIndex: 'expiresAt', render: (d) => (d ? (new Date(d) < new Date() ? <Tag bordered={false}>ended</Tag> : fmtDay(d)) : 'Never') },
          { title: 'Note', dataIndex: 'note' },
          { title: '', render: (_, i) => (isSuper ? <Button size="small" type="text" danger onClick={() => Modal.confirm({ title: `Delete ${i.code}?`, okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(i.code) })}>Delete</Button> : null) },
        ]}
      />
      <Modal open={Boolean(created)} onCancel={() => setCreated(null)} footer={null} title="Invite code created">
        <p className="text-slate-500">Share it with the students you’re inviting. Codes are random so they can’t be guessed.</p>
        <Typography.Title level={3} copyable className="text-center">
          {created}
        </Typography.Title>
      </Modal>
    </div>
  );
}
