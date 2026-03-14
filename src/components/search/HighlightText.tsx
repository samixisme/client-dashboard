import React from 'react';

export interface HighlightTextProps {
  text: string;
  className?: string;
  as?: React.ElementType;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, className, as: Component = 'span' }) => {
  if (!text) return null;

  // Split the text by <mark>...</mark> to extract highlighted sections safely
  // The capturing group keeps the matched HTML tags in the resulting array
  const parts = text.split(/(<mark(?: class="search-highlight")?>.*?<\/mark>)/gi);

  return (
    <Component className={className}>
      {parts.map((part, i) => {
        const lowerPart = part.toLowerCase();
        if (lowerPart.startsWith('<mark class="search-highlight">') && lowerPart.endsWith('</mark>')) {
          // Render the marked part safely by stripping the tags
          const content = part.substring(31, part.length - 7);
          return <mark key={i} className="search-highlight">{content}</mark>;
        } else if (lowerPart.startsWith('<mark>') && lowerPart.endsWith('</mark>')) {
          const content = part.substring(6, part.length - 7);
          return <mark key={i}>{content}</mark>;
        }

        // Plain text rendering safely escapes any other HTML tags
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </Component>
  );
};
