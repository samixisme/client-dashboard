import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { validateUrl } from './urlValidator';
import { optionalApiKeyAuth } from './authMiddleware';

const router = Router();

router.use(optionalApiKeyAuth);

// GET /api/link-meta?url=https://example.com
router.get('/', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url;
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      return res.status(400).json({ success: false, error: 'url query parameter is required' });
    }

    const urlValidation = validateUrl(rawUrl);
    if (!urlValidation.isValid) {
      return res.status(400).json({ success: false, error: urlValidation.error });
    }

    const { data: html } = await axios.get(rawUrl, {
      timeout: 5000,
      maxRedirects: 3,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkMetaBot/1.0)' },
      responseType: 'text',
      beforeRedirect: (options) => {
        const redirectUrl = options.href;
        const redirectValidation = validateUrl(redirectUrl);
        if (!redirectValidation.isValid) {
          throw new Error(`SSRF blocked redirect to: ${redirectUrl}`);
        }
      }
    });

    const $ = cheerio.load(html);

    // Extract title: prefer og:title, fallback to <title>
    const title =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('title').first().text().trim() ||
      '';

    // Extract favicon: prefer link[rel="icon"], fallback to /favicon.ico
    let favicon = '';
    const iconLink =
      $('link[rel="icon"]').attr('href') ||
      $('link[rel="shortcut icon"]').attr('href');

    if (iconLink) {
      try {
        favicon = new URL(iconLink, rawUrl).href;
      } catch {
        favicon = iconLink;
      }
    } else {
      try {
        const origin = new URL(rawUrl).origin;
        favicon = `${origin}/favicon.ico`;
      } catch {
        favicon = '';
      }
    }

    return res.json({ success: true, data: { title, favicon } });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to fetch link metadata' });
  }
});

export default router;