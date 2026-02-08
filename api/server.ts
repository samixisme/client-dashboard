import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import proxyHandler from './proxy';
import { optionalApiKeyAuth } from './authMiddleware';
import notificationsRouter from './notifications';

const app = express();
const port = 3001;

// Security middleware - Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disabled because proxy modifies CSP
  crossOriginEmbedderPolicy: false, // Allow embedding
}));

// CORS configuration - Allow requests from your frontend
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Rate limiting - Prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100, // 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Parse JSON bodies with size limit
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// VercelRequest and VercelResponse are compatible enough with Express req/res
// for the purposes of our proxyHandler. A small adapter might be needed if we add complexity.
app.get('/api/proxy', optionalApiKeyAuth, (req, res) => {
  proxyHandler(req, res);
});

// AI helper endpoints (backend-only secrets)
// 1) Extract colors from text (best-effort hex color extraction for dev)
app.post('/api/ai/extract-colors', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text content required' });
  }
  // Simple fallback: extract hex color codes from text
  const hexes = (text.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})/g) || []).slice(0, 20);
  const colors = hexes.map(h => ({ name: h, hex: h }));
  res.json({ colors });
});

// 2) Generate a brand asset (image) using AI on the backend
app.post('/api/ai/generate-brand-asset', async (req, res) => {
  const { logoUrl, prompt } = req.body;
  if (!logoUrl || !prompt) {
    return res.status(400).json({ error: 'logoUrl and prompt are required' });
  }
  // In a full deployment, this would call Google GenAI or another AI service using a secret key kept on the server.
  // For now, return a lightweight placeholder image data URL to keep the flow working in development.
  const placeholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
  return res.json({ imageUrl: placeholder });
});

// Novu notifications API
app.use('/api/notifications', notificationsRouter);

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
