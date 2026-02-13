import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { validateUrl, validateId } from './urlValidator';

export default async (req: Request, res: Response) => {
  const { url, projectId, feedbackId } = req.query;

  // Validate URL parameter
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required and must be a string' });
  }

  // SSRF Protection - Validate URL
  const urlValidation = validateUrl(url);
  if (!urlValidation.isValid) {
    return res.status(400).json({ error: urlValidation.error });
  }

  // Validate projectId and feedbackId if provided
  if (projectId && !validateId(projectId)) {
    return res.status(400).json({ error: 'Invalid projectId format' });
  }

  if (feedbackId && !validateId(feedbackId)) {
    return res.status(400).json({ error: 'Invalid feedbackId format' });
  }

  try {
    const response = await axios.get(url, {
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
      maxContentLength: 50 * 1024 * 1024, // 50MB limit to prevent DoS
      maxBodyLength: 50 * 1024 * 1024,
      timeout: 30000, // 30 second timeout
    });
    const $ = cheerio.load(response.data);

    const targetUrl = new URL(url);

    // Rewrite relative URLs to be absolute
    $('link[href], a[href]').each((i, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
        try {
          $(el).attr('href', new URL(href, targetUrl.href).href);
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    });

    $('script[src], img[src], iframe[src], source[src]').each((i, el) => {
      const src = $(el).attr('src');
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.startsWith('data:')) {
        try {
          $(el).attr('src', new URL(src, targetUrl.href).href);
        } catch (e) {
           // Ignore invalid URLs
        }
      }
    });

    // Remove CSP to allow our scripts
    $('meta[http-equiv="Content-Security-Policy"]').remove();

    // Inject Tailwind CDN and Config
    const tailwindScript = `<script src="https://cdn.tailwindcss.com"></script>`;
    const tailwindConfig = `
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: { sans: ['Inter', 'sans-serif'], mono: ['Roboto Mono', 'monospace'] },
            colors: {
              'primary': '#A3E635', 'primary-hover': '#84CC16', 'background': '#0A0A0A',
              'surface': '#1C1C1C', 'surface-light': '#272727', 'text-primary': '#F4F4F5',
              'text-secondary': '#A1A1AA', 'border-color': '#27272A'
            }
          }
        }
      }
    </script>`;
    
    // Inject Custom Styles (from index.html)
    const customStyles = `
    <style>
      .bg-glass { background-color: rgba(28, 28, 28, 0.65); backdrop-filter: blur(12px); }
      .bg-glass-light { background-color: rgba(39, 39, 39, 0.65); backdrop-filter: blur(12px); }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: #1C1C1C; }
      ::-webkit-scrollbar-thumb { background-color: #84CC16; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background-color: #A3E635; }
      
      /* Ensure our tool is on top and visible */
      #client-dashboard-feedback-tool {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none; /* Let clicks pass through by default */
        z-index: 99999;
      }
      #client-dashboard-feedback-tool * {
        pointer-events: auto; /* Re-enable pointer events for our children */
      }
      .feedback-tool-root {
        width: 100%;
        height: 100%;
      }
    </style>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    `;

    // Inject the feedback script
    // Note: We don't inject /feedback.css anymore because we use CDN + inline styles
    // In dev, point to the source directly so we don't need to rebuild.
    // We MUST inject Vite client and React Refresh preamble for HMR and React to work.
    const viteClient = `<script type="module" src="/@vite/client"></script>`;
    const reactRefresh = `
    <script type="module">
      import RefreshRuntime from "/@react-refresh"
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    `;
    const scriptTag = `<script type="module" src="/src/feedback-tool/index.tsx" data-project-id="${projectId}" data-feedback-id="${feedbackId}"></script>`;
    
    $('head').append(viteClient);
    $('head').append(reactRefresh);
    $('head').append(tailwindScript);
    $('head').append(tailwindConfig);
    $('head').append(customStyles);
    $('body').append(scriptTag);

    res.status(200).send($.html());
  } catch (error) {
    // Log detailed error server-side only
    console.error('Proxy Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      url: url,
      timestamp: new Date().toISOString()
    });

    // Return generic error to client (no sensitive details)
    res.status(500).json({
      error: 'Error fetching or modifying the URL. Please check if the URL is correct and publicly accessible.'
    });
  }
};
