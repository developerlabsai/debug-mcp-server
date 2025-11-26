/**
 * Express middleware
 */

import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import * as logger from '../lib/logger.js';

/**
 * CORS middleware - allow localhost only
 */
export function corsMiddleware() {
  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        return callback(null, true);
      }

      // Allow localhost and 127.0.0.1 on any port
      if (origin.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });
}

/**
 * Request logger middleware
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });

    next();
  };
}

/**
 * Error handler middleware
 */
export function errorHandler() {
  return (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Request error:', err);

    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  };
}

/**
 * JSON body size validator
 */
export function validateBodySize(maxSize: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      res.status(413).json({
        success: false,
        error: 'Payload too large',
        code: 'PAYLOAD_TOO_LARGE',
      });
      return;
    }

    next();
  };
}
