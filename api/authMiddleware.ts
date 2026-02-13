import { Request, Response, NextFunction } from 'express';

/**
 * API Key authentication middleware
 * REQUIRED in production, optional in development
 */
export function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const expectedApiKey = process.env.API_KEY;

  // In production, API_KEY is REQUIRED
  if (process.env.NODE_ENV === 'production' && !expectedApiKey) {
    console.error('🚨 SECURITY ERROR: API_KEY environment variable is required in production!');
    return res.status(500).json({
      error: 'Server configuration error. Contact administrator.'
    });
  }

  // If no API_KEY is configured in development, skip authentication (backward compatible)
  if (!expectedApiKey && process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  API running without authentication in development mode');
    return next();
  }

  // If API_KEY is configured, require it in the request
  const providedApiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!providedApiKey) {
    return res.status(401).json({
      error: 'API key required. Provide it via X-API-Key header or apiKey query parameter.'
    });
  }

  if (providedApiKey !== expectedApiKey) {
    return res.status(403).json({
      error: 'Invalid API key'
    });
  }

  next();
}
