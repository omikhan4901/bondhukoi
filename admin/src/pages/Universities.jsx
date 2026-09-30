import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Switch, Tag, Space, Alert } from 'antd';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAdmin, useChange } from '../hooks';
import { api, fmtDay } from '../lib';

const CLOSE_METERS = 20;
const DHAKA = [23.8151, 90.4255];

function meters(a, b) {
  const R = 6371000;
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function Clicks({ onClick }) {
  useMapEvents({ click: (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Fit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 3) map.fitBounds(points.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** Click to place corners, click the first (green) corner to close. Same as the app. */
function BoundaryEditor({ university, onClose }) {
  const [points, setPoints] = useState(university.boundary || []);
  const [closed, setClosed] = useState((university.boundary || []).length >= 3);
  const save = useChange(() => api(`/api/admin/universities/${university.id}/boundary`, { method: 'PUT', body: { boundary: points } }), {
    success: 'Campus boundary saved. Phones pick it up on their next check.',
    onSuccess: onClose,
  });
  const click = (p) => {
    if (closed) return;
    if (points.length >= 3 && meters(points[0], p) <= CLOSE_METERS) return setClosed(true);
    if (points.length < 100) setPoints([...points, p]);
  };
  const latlngs = points.map((p) => [p.lat, p.lng]);
  const color = closed ? '#16a34a' : '#c2410c';
  return (
    <Modal
      open
      width={880}
      title={`Campus boundary · ${university.name}`}
      onCancel={onClose}
      footer={
        <Space>
          <Button disabled={!points.length} onClick={() => (closed ? setClosed(false) : setPoints(points.slice(0, -1)))}>
            {closed ? 'Reopen' : 'Undo'}
          </Button>
          <Button disabled={!points.length} onClick={() => { setPoints([]); setClosed(false); }}>
            Clear
          </Button>
          <Button type="primary" disabled={!closed} loading={save.isPending} onClick={() => save.mutate()}>
            Save boundary
          </Button>
        </Space>
      }
    >
      <p className="text-slate-500">
        {closed
          ? `Closed · ${points.length} corners. Students inside this shape show as “On campus”.`
          : points.length < 3
            ? 'Click the map to place the corners of the campus.'
            : 'Click the green corner to close the boundary.'}
      </p>
      <div className="h-[480px] rounded-xl overflow-hidden border border-slate-200">
        <MapContainer center={points[0] ? [points[0].lat, points[0].lng] : DHAKA} zoom={17} style={{ height: '100%' }}>
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Clicks onClick={click} />
          <Fit points={points} />
          {latlngs.length >= 2 ? <Polygon positions={latlngs} pathOptions={{ color, weight: closed ? 3 : 2, fillOpacity: closed ? 0.2 : 0.1 }} /> : null}
          {latlngs.map((ll, i) => (
            <CircleMarker
              key={i}
              center={ll}
              radius={i === 0 && !closed && points.length >= 3 ? 9 : 5}
              pathOptions={{ color: '#fff', weight: 2, fillColor: i === 0 && !closed && points.length >= 3 ? '#16a34a' : color, fillOpacity: 1 }}
              eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); if (i === 0 && points.length >= 3) setClosed(true); } }}
            />
          ))}
        </MapContainer>
      </div>
    </Modal>
  );
}

function UniversityForm({ initial, onClose }) {
  const create = !initial;
  const save = useChange(
    (v) =>
      create
        ? api('/api/admin/universities', { method: 'POST', body: v })
        : api(`/api/admin/universities/${initial.id}`, { method: 'PATCH', body: v }),
    { success: create ? 'University added. Draw its campus boundary next.' : 'Saved.', onSuccess: onClose },
  );
  return (
    <Modal open title={create ? 'Add a university' : `Edit ${initial.name}`} onCancel={onClose} footer={null} destroyOnHidden>
      <Form
        layout="vertical"
        requiredMark={false}
        initialValues={initial ? { name: initial.name, shortName: initial.shortName, emailDomains: initial.emailDomains, isActive: initial.isActive } : { emailDomains: [] }}
        onFinish={(v) => save.mutate({ ...v, emailDomains: v.emailDomains.map((d) => d.trim().toLowerCase().replace(/^@/, '')) })}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true, min: 2 }]}>
          <Input placeholder="North South University" />
        </Form.Item>
        <Form.Item name="shortName" label="Short name" rules={[{ required: true }]}>
          <Input placeholder="NSU" maxLength={20} />
        </Form.Item>
        <Form.Item name="emailDomains" label="Student email domains" extra="Only these addresses (and their subdomains) can sign up." rules={[{ required: true, type: 'array', min: 1 }]}>
          <Select mode="tags" placeholder="northsouth.edu" tokenSeparators={[',', ' ']} open={false} />
        </Form.Item>
        {create ? null : (
          <Form.Item name="isActive" label="Open for sign-ups" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
        <Button type="primary" htmlType="submit" block loading={save.isPending}>
          Save
        </Button>
      </Form>
    </Modal>
  );
}

export default function Universities({ admin }) {
  const { data, isLoading } = useAdmin('/universities');
  const [editing, setEditing] = useState(null);
  const [drawing, setDrawing] = useState(null);
  const isSuper = admin.role === 'super';
  return (
    <div className="space-y-4">
      {!isSuper ? <Alert type="info" showIcon message="Only super admins can change universities and boundaries." /> : null}
      <div className="flex justify-end">
        {isSuper ? (
          <Button type="primary" onClick={() => setEditing('new')}>
            Add university
          </Button>
        ) : null}
      </div>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.universities}
        pagination={false}
        columns={[
          { title: 'University', dataIndex: 'name', render: (n, u) => <div><div className="font-medium">{n}</div><div className="text-slate-400 text-xs">{u.shortName}</div></div> },
          { title: 'Email domains', dataIndex: 'emailDomains', render: (d) => d.map((x) => <Tag key={x} bordered={false}>@{x}</Tag>) },
          { title: 'Students', dataIndex: 'students' },
          {
            title: 'Campus boundary',
            render: (_, u) => (u.boundary ? <span>Set <span className="text-slate-400 text-xs">· {fmtDay(u.boundaryUpdatedAt)}</span></span> : <Tag color="gold" bordered={false}>not drawn</Tag>),
          },
          { title: 'Sign-ups', dataIndex: 'isActive', render: (a) => (a ? <Tag color="green" bordered={false}>open</Tag> : <Tag bordered={false}>closed</Tag>) },
          {
            title: '',
            render: (_, u) =>
              isSuper ? (
                <Space>
                  <Button size="small" onClick={() => setDrawing(u)}>
                    {u.boundary ? 'Redraw' : 'Draw'} boundary
                  </Button>
                  <Button size="small" type="text" onClick={() => setEditing(u)}>
                    Edit
                  </Button>
                </Space>
              ) : null,
          },
        ]}
      />
      {editing ? <UniversityForm initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} /> : null}
      {drawing ? <BoundaryEditor university={drawing} onClose={() => setDrawing(null)} /> : null}
    </div>
  );
}
