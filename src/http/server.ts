/**
 * HTTP Server setup
 */

import express from 'express';
import type { Express } from 'express';
import { corsMiddleware, requestLogger, errorHandler, validateBodySize } from './middleware.js';
import { createRoutes } from './routes.js';
import type { ServerConfig } from '../types/index.js';
import type { ReportStorage } from '../storage/reports.js';
import type { ScreenshotStorage } from '../storage/screenshots.js';
import type { QuestionSessionManager } from '../storage/questions.js';
import * as logger from '../lib/logger.js';

export class HTTPServer {
  private app: Express;

  constructor(
    private config: ServerConfig,
    reportStorage: ReportStorage,
    screenshotStorage: ScreenshotStorage,
    questionManager: QuestionSessionManager,
    questionNotifier?: (sessionId: string) => void
  ) {
    this.app = express();

    // Middleware
    this.app.use(corsMiddleware());
    this.app.use(requestLogger());
    this.app.use(express.json({ limit: '50mb' })); // Large limit for base64 screenshots
    this.app.use(validateBodySize(config.maxReportSize));

    // Routes - pass notifier for auto-questions
    const routes = createRoutes(reportStorage, screenshotStorage, questionManager, questionNotifier);
    this.app.use('/api', routes);

    // Error handler (must be last)
    this.app.use(errorHandler());
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, '127.0.0.1', () => {
        logger.info(`HTTP server listening on http://127.0.0.1:${this.config.port}`);
        resolve();
      });
    });
  }

  /**
   * Get Express app instance
   */
  getApp(): Express {
    return this.app;
  }
}
