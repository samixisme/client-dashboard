import React from 'react';
import ReactDOM from 'react-dom/client';
import FeedbackTool from './FeedbackTool';

const container = document.createElement('div');
container.id = 'client-dashboard-feedback-tool';
document.body.appendChild(container);

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <FeedbackTool />
  </React.StrictMode>
);
