import { Table, Button, Form, Input, Select, Card, Tag, Modal } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api, fmtDay } from '../lib';

export default function Admins({ admin }) {
  const { data, isLoading } = useAdmin('/admins');
  const [form] = Form.useForm();
  const add = useChange((body) => api('/api/admin/admins', { method: 'POST', body }), { success: 'Added. They’ll set up two-factor on first sign-in.', onSuccess: () => form.resetFields() });
  const remove = useChange((id) => api(`/api/admin/admins/${id}`, { method: 'DELETE' }), { success: 'Removed.' });
  const isSuper = admin.role === 'super';
  return (
    <div className="space-y-6">
      {isSuper ? (
        <Card title="Add an admin">
          <Form form={form} layout="inline" initialValues={{ role: 'moderator' }} onFinish={(v) => add.mutate(v)} className="gap-y-3">
            <Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="Their BondhuKoi email" style={{ width: 260 }} />
            </Form.Item>
            <Form.Item name="role">
              <Select style={{ width: 150 }} options={[{ value: 'moderator', label: 'Moderator' }, { value: 'super', label: 'Super admin' }]} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={add.isPending}>
              Add
            </Button>
          </Form>
          <p className="text-slate-500 text-sm mt-3 mb-0">Moderators handle reports, feedback and accounts. Super admins can also change settings, universities, invites and admins.</p>
        </Card>
      ) : null}
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.admins}
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name', render: (n, a) => <div><div className="font-medium">{n}</div><div className="text-slate-400 text-xs">{a.email}</div></div> },
          { title: 'Role', dataIndex: 'role', render: (r) => <Tag color={r === 'super' ? 'orange' : 'default'} bordered={false}>{r === 'super' ? 'Super admin' : 'Moderator'}</Tag> },
          { title: 'Since', dataIndex: 'created_at', render: fmtDay },
          {
            title: '',
            render: (_, a) =>
              isSuper && a.id !== admin.id ? (
                <Button size="small" type="text" danger onClick={() => Modal.confirm({ title: `Remove ${a.name} as admin?`, okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(a.id) })}>
                  Remove
                </Button>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
