import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, App as AntApp } from 'antd';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib';
import App from './App';
import './index.css';

const theme = {
  token: {
    colorPrimary: '#c2410c',
    colorLink: '#c2410c',
    colorText: '#0f172a',
    colorTextSecondary: '#5b6b7f',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#e2e8f0',
    colorBgLayout: '#f8fafc',
    borderRadius: 10,
    fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  components: {
    Layout: { siderBg: '#ffffff', headerBg: '#ffffff', bodyBg: '#f8fafc' },
    Menu: { itemSelectedBg: '#fff4ee', itemSelectedColor: '#c2410c', itemBorderRadius: 10 },
    Card: { borderRadiusLG: 16 },
    Table: { headerBg: '#f8fafc' },
  },
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider theme={theme}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
