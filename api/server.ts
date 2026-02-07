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

// Novu notifications API
app.use('/api/notifications', notificationsRouter);

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
