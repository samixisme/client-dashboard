import React, { useState } from 'react';
import { CheckIcon, ClipboardIcon } from '../icons';

interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  textToCopy: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ textToCopy, className, ...props }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${className}`}
      aria-label="Copy to clipboard"
      {...props}
    >
      {copied ? (
        <CheckIcon className="w-4 h-4 text-green-400" />
      ) : (
        <ClipboardIcon className="w-4 h-4 text-gray-300" />
      )}
    </button>
  );
};
