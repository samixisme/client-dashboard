import React from 'react';
import { getHighlightParts, type MatchPosition } from '../../utils/searchHighlight';

export interface HighlightTextProps {
  text: string;
  positions?: MatchPosition[];
  maxLength?: number;
  className?: string;
}

/**
 * A safe component to render highlighted text using React elements.
 * This completely avoids dangerouslySetInnerHTML and prevents XSS vulnerabilities.
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  positions = [],
  maxLength = 200,
  className = '',
}) => {
  if (!text) return null;

  const parts = getHighlightParts(text, positions, maxLength);

  return (
    <span className={className}>
      {parts.map((part, index) => (
        part.isMatch ? (
          <mark key={index} className="search-highlight">
            {part.text}
          </mark>
        ) : (
          <React.Fragment key={index}>
            {part.text}
          </React.Fragment>
        )
      ))}
    </span>
  );
};
