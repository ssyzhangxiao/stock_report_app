import React from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Dashboard from './pages/Dashboard';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#4da6ff',
          colorBgBase: '#0d1117',
          colorBgContainer: '#161b27',
          colorBgElevated: '#1e2535',
          colorBorder: '#2a3347',
          colorText: '#e8eaf0',
          colorTextSecondary: '#8892a4',
          borderRadius: 8,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', sans-serif",
        },
      }}
    >
      <Dashboard />
    </ConfigProvider>
  );
};

export default App;

