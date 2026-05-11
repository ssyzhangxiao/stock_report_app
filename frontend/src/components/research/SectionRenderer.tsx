import React from 'react';
import { Typography, Divider } from 'antd';
import MarkdownTable from './MarkdownTable';
import type { SectionData } from '../../types/research';

const { Title, Paragraph, Text } = Typography;

interface Props {
  section: SectionData;
  maxLevel?: number;
  showTables?: boolean;
}

const SectionRenderer: React.FC<Props> = ({ section, maxLevel = 4, showTables = true }) => {
  if (!section || (!section.content && section.tables.length === 0 && section.subsections.length === 0)) {
    return null;
  }

  const renderContent = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inBlockquote = false;
    let blockquoteLines: string[] = [];

    const flushBlockquote = () => {
      if (blockquoteLines.length > 0) {
        elements.push(
          <div key={`bq-${elements.length}`} style={{
            borderLeft: '3px solid #4da6ff',
            paddingLeft: 12,
            marginBottom: 12,
            color: 'rgba(255,255,255,0.75)',
            fontSize: 13,
          }}>
            {blockquoteLines.map((line, i) => (
              <div key={i}>{line.replace(/^>\s*/, '')}</div>
            ))}
          </div>
        );
        blockquoteLines = [];
      }
      inBlockquote = false;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#')) {
        flushBlockquote();
        continue;
      }

      if (trimmed.startsWith('>')) {
        inBlockquote = true;
        blockquoteLines.push(trimmed);
        continue;
      }

      if (trimmed.startsWith('|')) {
        flushBlockquote();
        continue;
      }

      if (trimmed === '---' || trimmed === '***') {
        flushBlockquote();
        elements.push(<Divider key={`hr-${elements.length}`} style={{ margin: '12px 0' }} />);
        continue;
      }

      if (trimmed === '') {
        flushBlockquote();
        continue;
      }

      flushBlockquote();

      const formatted = trimmed
        .replace(/\*\*(.+?)\*\*/g, '⟪$1⟫')
        .replace(/\*(.+?)\*/g, '⟨$1⟩');

      elements.push(
        <Paragraph key={`p-${elements.length}`} style={{ marginBottom: 8, fontSize: 13, lineHeight: 1.8 }}>
          {formatted.split(/⟪|⟫|⟨|⟩/).map((part, i) => {
            if (i % 2 === 1) {
              return <Text strong key={i} style={{ color: '#4da6ff' }}>{part}</Text>;
            }
            if (i % 4 === 2) {
              return <Text italic key={i}>{part}</Text>;
            }
            return <span key={i}>{part}</span>;
          })}
        </Paragraph>
      );
    }

    flushBlockquote();
    return elements;
  };

  return (
    <div>
      {section.title && section.level <= maxLevel && (
        <Title level={Math.min(section.level + 1, 5) as any} style={{ marginTop: 16 }}>
          {section.title}
        </Title>
      )}

      {renderContent(section.content)}

      {showTables && section.tables.map((table, idx) => (
        <MarkdownTable key={`table-${idx}`} table={table} />
      ))}

      {section.subsections.map((sub, idx) => (
        <SectionRenderer key={`sub-${idx}`} section={sub} maxLevel={maxLevel} showTables={showTables} />
      ))}
    </div>
  );
};

export default SectionRenderer;
