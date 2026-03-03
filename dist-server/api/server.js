"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const proxy_1 = __importDefault(require("./proxy"));
const authMiddleware_1 = require("./authMiddleware");
const notifications_1 = __importDefault(require("./notifications"));
const social_1 = __importDefault(require("./social"));
const webhooks_1 = __importDefault(require("./webhooks"));
// Load environment variables from .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3001;
// Security middleware - Helmet for security headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Disabled because proxy modifies CSP
    crossOriginEmbedderPolicy: false, // Allow embedding
}));
// CORS configuration - Strict origin validation in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : (process.env.NODE_ENV === 'production'
        ? [] // No wildcard in production - must set ALLOWED_ORIGINS
        : ['http://localhost:3000', 'http://localhost:5173']); // Dev mode only
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    console.error('⚠️  SECURITY WARNING: ALLOWED_ORIGINS must be set in production!');
    process.exit(1);
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`🚫 Blocked CORS request from unauthorized origin: ${origin}`);
            callback(new Error('CORS policy violation'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));
// Rate limiting - Prevent abuse
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 100, // 100 requests per windowMs
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Parse JSON bodies with size limit
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ limit: '1mb', extended: true }));
// VercelRequest and VercelResponse are compatible enough with Express req/res
// for the purposes of our proxyHandler. A small adapter might be needed if we add complexity.
app.get('/api/proxy', authMiddleware_1.optionalApiKeyAuth, (req, res) => {
    (0, proxy_1.default)(req, res);
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
app.use('/api/notifications', notifications_1.default);
// Social media API (OAuth + platform data proxy)
app.use('/api/social', social_1.default);
// Webhook handlers (Instagram, Facebook, Twitter, etc.)
app.use('/api/webhooks', webhooks_1.default);
// Health check endpoint for load balancer and monitoring
app.get('/health', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: 'OK',
        timestamp: Date.now(),
        service: 'client-dashboard-api',
        version: process.env.npm_package_version || '1.0.0',
    };
    try {
        res.status(200).json(healthcheck);
    }
    catch (error) {
        healthcheck.message = error instanceof Error ? error.message : 'Unknown error';
        res.status(503).json(healthcheck);
    }
});
// Readiness check (for Kubernetes-style orchestration)
app.get('/ready', (req, res) => {
    // Add checks for database connections, external services, etc.
    const ready = {
        ready: true,
        timestamp: Date.now(),
        checks: {
            server: 'ok',
            // Add more checks as needed:
            // database: await checkDatabase(),
            // firebase: await checkFirebase(),
        }
    };
    res.status(200).json(ready);
});
// Liveness check (minimal check that process is alive)
app.get('/alive', (req, res) => {
    res.status(200).json({ alive: true });
});
// PM2 ready signal support
if (process.send) {
    process.send('ready');
}
app.listen(port, () => {
    console.log(`API server listening at http://localhost:${port}`);
});
