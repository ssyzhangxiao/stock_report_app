import React, { useState, useMemo } from 'react';
import { Table, Typography, Segmented } from 'antd';
import { TableOutlined, BarChartOutlined } from '@ant-design/icons';
import type { TableData } from '../../types/research';
import { detectChartType } from './SmartChartDetector';
import SmartChart from './SmartChart';

const { Text } = Typography;

interface Props {
  table: TableData;
  title?: string;
  compact?: boolean;
  scrollX?: number;
}

const MarkdownTable: React.FC<Props> = ({ table, title, compact = false, scrollX }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const chartConfig = useMemo(() => detectChartType(table), [table]);

  if (!table.headers || !table.rows || table.headers.length === 0) return null;

  const columns = table.headers.map((header, idx) => ({
    title: header,
    dataIndex: idx,
    key: idx,
    render: (text: string) => {
      const isNeg = text.includes('🔴') || text.startsWith('-') || /-\d/.test(text);
      const isPos = text.includes('🟢') || text.includes('★');
      const style: React.CSSProperties = { fontSize: compact ? 12 : 13, whiteSpace: 'pre-wrap' };
      if (isNeg) style.color = '#ff4d4f';
      if (isPos) style.color = '#52c41a';
      return <Text style={style}>{text}</Text>;
    },
  }));

  const dataSource = table.rows.map((row, idx) => ({
    key: idx,
    ...row,
  }));

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        {title ? (
          <Text strong style={{ fontSize: 14 }}>{title}</Text>
        ) : <span />}
        {chartConfig.canChart && (
          <Segmented
            size="small"
            value={viewMode}
            onChange={(v) => setViewMode(v as 'table' | 'chart')}
            options={[
              { label: '表格', value: 'table', icon: <TableOutlined /> },
              { label: '图表', value: 'chart', icon: <BarChartOutlined /> },
            ]}
            style={{ background: 'rgba(255,255,255,0.06)' }}
          />
        )}
      </div>

      {viewMode === 'chart' && chartConfig.canChart ? (
        <SmartChart config={chartConfig} />
      ) : (
        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size={compact ? 'small' : 'middle'}
          bordered
          scroll={scrollX ? { x: scrollX } : undefined}
          style={{ fontSize: compact ? 12 : 13 }}
        />
      )}
    </div>
  );
};

export default MarkdownTable;