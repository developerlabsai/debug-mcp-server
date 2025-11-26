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
  ListBacklogParams,
  ListBacklogResult,
  AddToBacklogParams,
  UpdateBacklogItemParams,
  ProcessBacklogItemParams,
  BacklogItem,
} from '../types/index.js';
import type { ReportStorage } from '../storage/reports.js';
import type { QuestionSessionManager } from '../storage/questions.js';
import type { BacklogStorage } from '../storage/backlog.js';
import * as logger from '../lib/logger.js';

export class MCPTools {
  constructor(
    private reportStorage: ReportStorage,
    private questionManager: QuestionSessionManager,
    private questionNotifier: (sessionId: string) => void,
    private backlogStorage?: BacklogStorage
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

  // ============================================================================
  // Backlog Tools
  // ============================================================================

  /**
   * List backlog items with optional filters
   */
  async listBacklog(params: ListBacklogParams = {}): Promise<ListBacklogResult> {
    logger.debug('MCP Tool: list_backlog', params);

    if (!this.backlogStorage) {
      throw new Error('Backlog storage not initialized');
    }

    const items = await this.backlogStorage.listItems(params);
    const stats = await this.backlogStorage.getStats();

    return { items, stats };
  }

  /**
   * Add a debug report to the backlog
   */
  async addToBacklog(params: AddToBacklogParams): Promise<BacklogItem> {
    logger.debug('MCP Tool: add_to_backlog', params);

    if (!this.backlogStorage) {
      throw new Error('Backlog storage not initialized');
    }

    const item = await this.backlogStorage.addItem({
      reportId: params.reportId,
      projectPath: params.projectPath,
      comment: params.comment,
      url: params.url,
      timestamp: params.timestamp,
      priority: params.priority || 'medium',
      status: 'pending',
    });

    return item;
  }

  /**
   * Update a backlog item's status or priority
   */
  async updateBacklogItem(params: UpdateBacklogItemParams): Promise<BacklogItem> {
    logger.debug('MCP Tool: update_backlog_item', params);

    if (!this.backlogStorage) {
      throw new Error('Backlog storage not initialized');
    }

    const updates: Partial<BacklogItem> = {};
    if (params.status) updates.status = params.status;
    if (params.priority) updates.priority = params.priority;
    if (params.comment) updates.comment = params.comment;

    const item = await this.backlogStorage.updateItem(params.id, updates);

    if (!item) {
      throw new Error(`Backlog item not found: ${params.id}`);
    }

    return item;
  }

  /**
   * Get the next backlog item to process (highest priority, oldest first)
   */
  async getNextBacklogItem(): Promise<BacklogItem | null> {
    logger.debug('MCP Tool: get_next_backlog_item');

    if (!this.backlogStorage) {
      throw new Error('Backlog storage not initialized');
    }

    const items = await this.backlogStorage.listItems({ status: 'pending', limit: 1 });
    return items[0] || null;
  }

  /**
   * Process a backlog item - marks it as in_progress and returns the associated report
   */
  async processBacklogItem(params: ProcessBacklogItemParams) {
    logger.debug('MCP Tool: process_backlog_item', params);

    if (!this.backlogStorage) {
      throw new Error('Backlog storage not initialized');
    }

    // Get the backlog item
    const item = await this.backlogStorage.getItem(params.id);
    if (!item) {
      throw new Error(`Backlog item not found: ${params.id}`);
    }

    // Mark as in progress
    await this.backlogStorage.updateItem(params.id, { status: 'in_progress' });

    // Get the associated debug report
    const report = await this.reportStorage.getReport(item.reportId);

    return {
      backlogItem: item,
      report,
    };
  }

  /**
   * Resolve a backlog item
   */
  async resolveBacklogItem(params: { id: string }): Promise<BacklogItem> {
    logger.debug('MCP Tool: resolve_backlog_item', params);

    if (!this.backlogStorage) {
      throw new Error('Backlog storage not initialized');
    }

    const item = await this.backlogStorage.updateItem(params.id, { status: 'resolved' });

    if (!item) {
      throw new Error(`Backlog item not found: ${params.id}`);
    }

    return item;
  }

  /**
   * Dismiss a backlog item
   */
  async dismissBacklogItem(params: { id: string }): Promise<BacklogItem> {
    logger.debug('MCP Tool: dismiss_backlog_item', params);

    if (!this.backlogStorage) {
      throw new Error('Backlog storage not initialized');
    }

    const item = await this.backlogStorage.updateItem(params.id, { status: 'dismissed' });

    if (!item) {
      throw new Error(`Backlog item not found: ${params.id}`);
    }

    return item;
  }
}
