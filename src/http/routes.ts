/**
 * HTTP API routes
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ReportStorage } from '../storage/reports.js';
import type { ScreenshotStorage } from '../storage/screenshots.js';
import type { QuestionSessionManager } from '../storage/questions.js';
import type {
  SubmitDebugReportRequest,
  SubmitDebugReportResponse,
  SubmitAnswersRequest,
  SubmitAnswersResponse,
  DebugReport,
} from '../types/index.js';
import { generateId } from '../lib/utils.js';
import * as logger from '../lib/logger.js';

// Default clarifying questions to ask users
const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    text: 'What were you trying to do when this issue occurred?',
    type: 'text' as const,
    required: true,
  },
  {
    id: 'q2',
    text: 'What did you expect to happen?',
    type: 'text' as const,
    required: true,
  },
  {
    id: 'q3',
    text: 'How urgent is this issue?',
    type: 'multipleChoice' as const,
    options: ['Critical - blocking work', 'High - needs attention soon', 'Medium - can wait', 'Low - nice to fix'],
    required: true,
  },
  {
    id: 'q4',
    text: 'Any additional context or steps to reproduce?',
    type: 'text' as const,
    required: false,
  },
];

export function createRoutes(
  reportStorage: ReportStorage,
  screenshotStorage: ScreenshotStorage,
  questionManager: QuestionSessionManager,
  questionNotifier?: (sessionId: string) => void
): Router {
  const router = Router();

  /**
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: Date.now(),
        activeSessions: questionManager.getActiveSessionCount(),
      },
    });
  });

  /**
   * Submit debug report from browser
   */
  router.post('/debug', async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as SubmitDebugReportRequest;

      // Validate required fields
      if (!body.logs || !body.url || !body.timestamp) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: logs, url, timestamp',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Generate report ID
      const reportId = generateId(12);

      // Handle screenshot if provided
      let screenshotFilename: string | undefined;
      if (body.screenshot) {
        try {
          screenshotFilename = await screenshotStorage.saveScreenshot(
            reportId,
            body.screenshot
          );
        } catch (error) {
          logger.warn('Failed to save screenshot:', error);
          // Continue without screenshot
        }
      }

      // Create debug report
      const report: DebugReport = {
        id: reportId,
        timestamp: body.timestamp,
        url: body.url,
        userAgent: body.userAgent || req.get('user-agent') || 'Unknown',
        logs: body.logs,
        error: body.error,
        screenshot: screenshotFilename,
        comment: body.comment || '',
        files: body.files,
      };

      // Save report
      await reportStorage.saveReport(report);

      // Auto-send clarifying questions if notifier is available
      let sessionId: string | undefined;
      if (questionNotifier) {
        sessionId = questionManager.createSession(DEFAULT_QUESTIONS, 300000); // 5 min timeout
        logger.info(`Auto-created question session ${sessionId} for report ${reportId}`);
        questionNotifier(sessionId);
      }

      const response: SubmitDebugReportResponse = {
        success: true,
        data: {
          reportId,
          timestamp: report.timestamp,
          sessionId, // Include session ID so widget knows questions are coming
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Error submitting debug report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SUBMISSION_ERROR',
      });
    }
  });

  /**
   * Submit answers to Q&A session
   */
  router.post('/questions/answer', async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as SubmitAnswersRequest;

      // Validate required fields
      if (!body.sessionId || !body.answers) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: sessionId, answers',
          code: 'MISSING_FIELDS',
        });
        return;
      }

      // Submit answers
      const success = questionManager.submitAnswers(
        body.sessionId,
        body.answers.map(a => ({
          ...a,
          timestamp: Date.now(),
        }))
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Session not found or already answered',
          code: 'SESSION_NOT_FOUND',
        });
        return;
      }

      const response: SubmitAnswersResponse = {
        success: true,
        data: {
          sessionId: body.sessionId,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Error submitting answers:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'SUBMISSION_ERROR',
      });
    }
  });

  return router;
}
