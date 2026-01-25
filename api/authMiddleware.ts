import { Request, Response, NextFunction } from 'express';

/**
 * Optional API Key authentication middleware
 * Only enforces auth if API_KEY environment variable is set
 */
export function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const expectedApiKey = process.env.API_KEY;

  // If no API_KEY is configured, skip authentication (backward compatible)
  if (!expectedApiKey) {
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
