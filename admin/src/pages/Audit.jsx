import { Table } from 'antd';
import { useAdmin } from '../hooks';
import { fmtDate } from '../lib';

const pretty = (v) => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v));

export default function Audit() {
  const { data, isLoading } = useAdmin('/audit');
  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={data?.entries}
      pagination={{ pageSize: 50, hideOnSinglePage: true }}
      expandable={{
        rowExpandable: (r) => r.before != null || r.after != null,
        expandedRowRender: (r) => (
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-slate-400 mb-1">Before</div>
              <pre className="bg-slate-50 p-3 rounded-lg overflow-auto">{pretty(r.before)}</pre>
            </div>
            <div>
              <div className="text-slate-400 mb-1">After</div>
              <pre className="bg-slate-50 p-3 rounded-lg overflow-auto">{pretty(r.after)}</pre>
            </div>
          </div>
        ),
      }}
      columns={[
        { title: 'When', dataIndex: 'at', render: fmtDate, width: 190 },
        { title: 'Admin', dataIndex: 'admin' },
        { title: 'Action', dataIndex: 'action', render: (a) => a.replace(/_/g, ' ') },
        { title: 'Target', render: (_, r) => (r.targetType ? <span className="text-slate-500">{r.targetType} · <span className="font-mono text-xs">{r.targetId?.slice(0, 12)}</span></span> : '—') },
      ]}
    />
  );
}
