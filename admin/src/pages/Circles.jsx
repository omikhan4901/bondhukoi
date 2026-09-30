import { useState } from 'react';
import { Table, Input, Button, Modal, Space, Tag } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api, fmtDay } from '../lib';

export default function Circles() {
  const [q, setQ] = useState('');
  const { data, isLoading } = useAdmin(`/circles${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const rename = useChange(({ id, name }) => api(`/api/admin/circles/${id}`, { method: 'PATCH', body: { name } }), { success: 'Renamed.' });
  const remove = useChange((id) => api(`/api/admin/circles/${id}`, { method: 'DELETE' }), { success: 'Circle deleted.' });

  const askRename = (c) => {
    let name = c.name;
    Modal.confirm({
      title: 'Rename circle',
      content: <Input defaultValue={c.name} maxLength={60} onChange={(e) => (name = e.target.value)} />,
      okText: 'Rename',
      onOk: () => rename.mutateAsync({ id: c.id, name }),
    });
  };

  return (
    <div className="space-y-4">
      <Input.Search placeholder="Circle name" allowClear onSearch={setQ} style={{ maxWidth: 360 }} />
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.circles}
        pagination={{ pageSize: 25, hideOnSinglePage: true }}
        columns={[
          { title: 'Circle', dataIndex: 'name', render: (n) => <span className="font-medium">{n}</span> },
          { title: 'Created by', dataIndex: 'createdBy', responsive: ['md'] },
          { title: 'Members', dataIndex: 'members' },
          { title: 'Reports', dataIndex: 'reports', render: (r) => (r ? <Tag color="red" bordered={false}>{r}</Tag> : 0) },
          { title: 'Created', dataIndex: 'createdAt', render: fmtDay, responsive: ['md'] },
          {
            title: '',
            render: (_, c) => (
              <Space>
                <Button size="small" type="text" onClick={() => askRename(c)}>
                  Rename
                </Button>
                <Button
                  size="small"
                  type="text"
                  danger
                  onClick={() => Modal.confirm({ title: `Delete “${c.name}”?`, content: 'It’s removed for all its members. Use this for abusive circles.', okText: 'Delete', okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(c.id) })}
                >
                  Delete
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <p className="text-xs text-slate-400">Names and sizes only. Who is in a circle’s place is never shown here.</p>
    </div>
  );
}
