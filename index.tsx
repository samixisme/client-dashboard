
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { HashRouter } from 'react-router-dom';
import PrivacyPage from './pages/PrivacyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import './src/index.css'; // Import Tailwind CSS
import './cursor.css'; // Import cursor styles
import './shimmer.css'; // Import shimmer animation styles

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const normalizePathname = (pathname: string) => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed.toLowerCase();
};

const legalPageByPath: Record<string, React.ReactElement> = {
  '/privacy': <PrivacyPage />,
  '/privacy-policy': <PrivacyPage />,
  '/terms': <TermsOfServicePage />,
  '/terms-of-service': <TermsOfServicePage />,
};

const legalPage = legalPageByPath[normalizePathname(window.location.pathname)];

if (legalPage) {
  root.render(legalPage);
} else {
  root.render(
    <HashRouter>
      <App />
    </HashRouter>
  );
}
