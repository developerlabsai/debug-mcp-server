/**
 * MCP Tools implementation
 */

import type {
  ListDebugReportsResult,
  GetDebugReportParams,
  AskUserQuestionsParams,
  AskUserQuestionsResult,
  ClearOldReportsParams,
  ClearOldReportsResult,
} from '../types/index.js';
import type { ReportStorage } from '../storage/reports.js';
import type { QuestionSessionManager } from '../storage/questions.js';
import * as logger from '../lib/logger.js';

export class MCPTools {
  constructor(
    private reportStorage: ReportStorage,
    private questionManager: QuestionSessionManager,
    private questionNotifier: (sessionId: string) => void
  ) {}

  /**
   * List all debug reports
   */
  async listDebugReports(): Promise<ListDebugReportsResult> {
    logger.debug('MCP Tool: list_debug_reports');

    const reports = await this.reportStorage.listReports();

    return { reports };
  }

  /**
   * Get a specific debug report by ID
   */
  async getDebugReport(params: GetDebugReportParams) {
    logger.debug('MCP Tool: get_debug_report', params);

    const report = await this.reportStorage.getReport(params.id);

    if (!report) {
      throw new Error(`Report not found: ${params.id}`);
    }

    return report;
  }

  /**
   * Ask user questions and wait for answers
   */
  async askUserQuestions(params: AskUserQuestionsParams): Promise<AskUserQuestionsResult> {
    logger.debug('MCP Tool: ask_user_questions', params);

    const { questions, timeout = 120000 } = params;

    // Create session
    const sessionId = this.questionManager.createSession(questions, timeout);

    // Notify browser (via WebSocket)
    this.questionNotifier(sessionId);

    // Wait for answers
    try {
      const answers = await this.questionManager.waitForAnswers(sessionId);
      return { answers };
    } catch (error) {
      logger.error('Failed to get answers:', error);
      throw new Error('Question session timed out or failed');
    }
  }

  /**
   * Clear old debug reports
   */
  async clearOldReports(params: ClearOldReportsParams): Promise<ClearOldReportsResult> {
    logger.debug('MCP Tool: clear_old_reports', params);

    const { olderThanDays = 7 } = params;

    const result = await this.reportStorage.deleteOldReports(olderThanDays);

    return result;
  }
}
