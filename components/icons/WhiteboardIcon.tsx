import React from 'react';

export const WhiteboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.75}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 3h16.5M3.75 3v13.5A2.25 2.25 0 006 18.75h12a2.25 2.25 0 002.25-2.25V3M3.75 3H3m17.25 0H21M9 21l3-3m0 0l3 3m-3-3v-3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8.25 9.75h.008v.008H8.25V9.75zm3.75 0h.008v.008H12V9.75zm3.75 0h.008v.008h-.008V9.75z"
    />
  </svg>
);
