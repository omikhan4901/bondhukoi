import { useState } from 'react';
import { Table, InputNumber, Button, Alert } from 'antd';
import { useAdmin, useChange } from '../hooks';
import { api } from '../lib';

export default function Limits({ admin }) {
  const { data, isLoading } = useAdmin('/limits');
  const [draft, setDraft] = useState({});
  const save = useChange(() => api('/api/admin/limits', { method: 'PUT', body: draft }), { success: 'Saved. Takes effect within 15 seconds.', onSuccess: () => setDraft({}) });
  const ro = admin.role !== 'super';
  return (
    <div className="space-y-4">
      <Alert type="info" showIcon message="Limits count per signed-in person (per network before sign-in). Lower them if something is being abused." />
      <Table
        rowKey="name"
        loading={isLoading}
        dataSource={data?.limits}
        pagination={false}
        columns={[
          { title: 'Limit', dataIndex: 'label' },
          { title: 'Default', dataIndex: 'defaultMax' },
          {
            title: 'Now',
            render: (_, l) => (
              <InputNumber
                disabled={ro}
                min={1}
                max={100000}
                value={draft[l.name] !== undefined ? draft[l.name] : l.max}
                onChange={(v) => setDraft({ ...draft, [l.name]: v === l.defaultMax ? null : v })}
              />
            ),
          },
        ]}
      />
      {Object.keys(draft).length && !ro ? (
        <Button type="primary" loading={save.isPending} onClick={() => save.mutate()}>
          Save limits
        </Button>
      ) : null}
    </div>
  );
}
