import React from 'react';

/**
 * A secure component to render highlighted text, e.g. from Meilisearch hit._formatted.
 * It parses <mark> tags to render text safely without dangerouslySetInnerHTML.
 */
export const HighlightText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
    // Split the text by <mark>...</mark> to extract highlighted sections safely
    const parts = text.split(/(<mark>.*?<\/mark>)/gi);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.toLowerCase().startsWith('<mark>') && part.toLowerCase().endsWith('</mark>')) {
                    // Render the marked part safely by stripping the tags
                    const content = part.slice(6, -7);
                    return <mark key={i}>{content}</mark>;
                }
                // Plain text rendering safely escapes any other HTML tags
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </span>
    );
};
