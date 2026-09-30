import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Tag, Grid, Drawer } from 'antd';
import { DashboardOutlined, UserAddOutlined, TeamOutlined, FlagOutlined, MessageOutlined, BankOutlined, ApartmentOutlined, KeyOutlined, SettingOutlined, DashOutlined, SafetyOutlined, HistoryOutlined, MenuOutlined, LogoutOutlined } from '@ant-design/icons';
import { supabase } from './lib';
import Overview from './pages/Overview';
import Signups from './pages/Signups';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Feedback from './pages/Feedback';
import Universities from './pages/Universities';
import Circles from './pages/Circles';
import Invites from './pages/Invites';
import Settings from './pages/Settings';
import Limits from './pages/Limits';
import Admins from './pages/Admins';
import Audit from './pages/Audit';

const PAGES = [
  { key: 'overview', label: 'Overview', icon: <DashboardOutlined />, Page: Overview },
  { key: 'signups', label: 'Sign-ups', icon: <UserAddOutlined />, Page: Signups },
  { key: 'users', label: 'Users', icon: <TeamOutlined />, Page: Users },
  { key: 'reports', label: 'Reports', icon: <FlagOutlined />, Page: Reports },
  { key: 'feedback', label: 'Feedback', icon: <MessageOutlined />, Page: Feedback },
  { key: 'universities', label: 'Universities', icon: <BankOutlined />, Page: Universities },
  { key: 'circles', label: 'Circles', icon: <ApartmentOutlined />, Page: Circles },
  { key: 'invites', label: 'Invites', icon: <KeyOutlined />, Page: Invites },
  { key: 'settings', label: 'Settings', icon: <SettingOutlined />, Page: Settings },
  { key: 'limits', label: 'Rate limits', icon: <DashOutlined />, Page: Limits },
  { key: 'admins', label: 'Admins', icon: <SafetyOutlined />, Page: Admins },
  { key: 'audit', label: 'Audit log', icon: <HistoryOutlined />, Page: Audit },
];

const fromHash = () => {
  const key = window.location.hash.replace('#', '');
  return PAGES.some((p) => p.key === key) ? key : 'overview';
};

export default function Console({ admin, Logo }) {
  const [page, setPage] = useState(fromHash);
  const [open, setOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const wide = screens.lg;

  useEffect(() => {
    const onHash = () => setPage(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const go = (key) => {
    window.location.hash = key;
    setOpen(false);
  };
  const { Page, label } = PAGES.find((p) => p.key === page);
  const menu = <Menu mode="inline" selectedKeys={[page]} items={PAGES.map(({ key, label: l, icon }) => ({ key, label: l, icon }))} onClick={(e) => go(e.key)} style={{ border: 0 }} />;

  return (
    <Layout className="min-h-screen">
      {wide ? (
        <Layout.Sider width={232} className="border-r border-slate-200" style={{ position: 'sticky', top: 0, height: '100vh' }}>
          <div className="px-5 py-5">
            <Logo />
          </div>
          <div className="px-2">{menu}</div>
        </Layout.Sider>
      ) : (
        <Drawer open={open} onClose={() => setOpen(false)} placement="left" width={260} title={<Logo />} styles={{ body: { padding: 8 } }}>
          {menu}
        </Drawer>
      )}
      <Layout>
        <Layout.Header className="border-b border-slate-200 flex items-center justify-between" style={{ paddingInline: wide ? 32 : 16, height: 64 }}>
          <div className="flex items-center gap-3">
            {wide ? null : <Button type="text" icon={<MenuOutlined />} onClick={() => setOpen(true)} aria-label="Menu" />}
            <h1 className="font-display text-lg font-bold m-0">{label}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-500 text-sm hidden sm:inline">{admin.name}</span>
            <Tag color={admin.role === 'super' ? 'orange' : 'default'} bordered={false}>
              {admin.role === 'super' ? 'Super admin' : 'Moderator'}
            </Tag>
            <Button type="text" icon={<LogoutOutlined />} onClick={() => supabase.auth.signOut()} aria-label="Sign out" />
          </div>
        </Layout.Header>
        <Layout.Content style={{ padding: wide ? 32 : 16 }}>
          <div className="max-w-6xl mx-auto">
            <Page admin={admin} go={go} />
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
