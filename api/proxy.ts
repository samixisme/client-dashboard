import { Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export default async (req: Request, res: Response) => {
  const { url, projectId, feedbackId } = req.query;

  if (typeof url !== 'string') {
    return res.status(400).send('URL is required');
  }

  try {
    const response = await axios.get(url, {
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    const $ = cheerio.load(response.data);

    const targetUrl = new URL(url);
    const origin = targetUrl.origin;

    // Rewrite relative URLs to be absolute
    // This is crucial for CSS, Images, and Scripts to load correctly from the original source
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

    // Inject the feedback script
    // We use a relative path assuming the proxy is served from the same domain as the main app
    // or properly proxied via Vite.
    const scriptTag = `<script src="/feedback.js" data-project-id="${projectId}" data-feedback-id="${feedbackId}" async></script>`;
    $('body').append(scriptTag);

    // Add a base tag as a fallback for things we missed, but be careful as it can break some SPAs
    // $('head').prepend(`<base href="${targetUrl.href}">`);

    res.status(200).send($.html());
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).send('Error fetching or modifying the URL. Please check if the URL is correct and publicly accessible.');
  }
};
