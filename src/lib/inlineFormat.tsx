import { Fragment, ReactNode } from 'react';

/**
 * Render plain text with simple **bold** markdown support while preserving
 * line breaks. HTML is escaped — only `**...**` becomes <strong>.
 */
export function renderInlineFormatted(text: string | null | undefined): ReactNode {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  return lines.map((line, lineIdx) => {
    const parts: ReactNode[] = [];
    // Split on **...** (non-greedy). Odd indices are bold content.
    const segments = line.split(/\*\*([^*]+)\*\*/g);
    segments.forEach((seg, i) => {
      if (i % 2 === 1) {
        parts.push(<strong key={`b-${lineIdx}-${i}`}>{seg}</strong>);
      } else if (seg) {
        parts.push(<Fragment key={`t-${lineIdx}-${i}`}>{seg}</Fragment>);
      }
    });
    return (
      <Fragment key={lineIdx}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </Fragment>
    );
  });
}
