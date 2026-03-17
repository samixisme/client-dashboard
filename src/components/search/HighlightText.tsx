import React from 'react';

function unescapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export interface HighlightTextProps {
  /** The HTML string containing <mark> tags to be highlighted */
  htmlString: string;
  /** The polymorphic component to render as the root element. Defaults to 'span'. */
  as?: React.ElementType;
  className?: string;
}

/**
 * Safely renders highlighted text from Meilisearch without using dangerouslySetInnerHTML.
 * Parses strings containing <mark class="search-highlight">...</mark> into an array
 * of safe React nodes.
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  htmlString,
  as: Component = 'span',
  className = '',
}) => {
  if (!htmlString) {
    return <Component className={className} />;
  }

  // Regex to split by <mark> tags. Captures the class attribute (if any) and the inner text.
  // The structure of the split array will be:
  // [text_before, optional_class_attr, mark_content, text_after, optional_class_attr, mark_content, ...]
  // So for every match, we get 3 parts: text, class, mark_content.
  const regex = /<mark\s*(?:class="([^"]*)")?>([\s\S]*?)<\/mark>/gi;

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(htmlString)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      nodes.push(unescapeHtml(htmlString.slice(lastIndex, match.index)));
    }

    // Add the highlighted part
    const [, classAttr, innerText] = match;
    nodes.push(
      <mark key={match.index} className={classAttr || 'search-highlight'}>
        {unescapeHtml(innerText)}
      </mark>
    );

    lastIndex = regex.lastIndex;
  }

  // Add any remaining text after the last match
  if (lastIndex < htmlString.length) {
    nodes.push(unescapeHtml(htmlString.slice(lastIndex)));
  }

  return <Component className={className}>{nodes}</Component>;
};
