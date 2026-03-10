import React from 'react';

/**
 * A safe component to render highlighted text, preventing Stored XSS.
 * It expects text where highlights are wrapped in <mark class="search-highlight">...</mark>.
 *
 * Instead of using dangerouslySetInnerHTML, this component splits the string by the <mark> tags
 * and renders the pieces as separate React text nodes and elements.
 */
export const HighlightText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  if (!text) return null;

  // We split by <mark class="search-highlight">...</mark>
  // or simple <mark>...</mark> depending on what highlightMatches returns.
  // The utility `highlightMatches` returns: <mark class="search-highlight">MATCH</mark>
  const parts = text.split(/(<mark[^>]*>.*?<\/mark>)/gi);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        const lowerPart = part.toLowerCase();
        if (lowerPart.startsWith('<mark') && lowerPart.endsWith('</mark>')) {
          // Extract the inner content
          const match = part.match(/<mark[^>]*>(.*?)<\/mark>/i);
          const content = match ? match[1] : '';
          return <mark key={i} className="search-highlight">{content}</mark>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
};
