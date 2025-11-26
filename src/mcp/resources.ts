/**
 * MCP Resources implementation
 */

import type { ReportStorage } from '../storage/reports.js';
import type { ScreenshotStorage } from '../storage/screenshots.js';
import * as logger from '../lib/logger.js';

export class MCPResources {
  constructor(
    private reportStorage: ReportStorage,
    private screenshotStorage: ScreenshotStorage
  ) {}

  /**
   * Get latest debug report
   */
  async getLatestReport() {
    logger.debug('MCP Resource: debug://reports/latest');

    const report = await this.reportStorage.getLatestReport();

    if (!report) {
      throw new Error('No reports found');
    }

    return report;
  }

  /**
   * Get debug report by ID
   */
  async getReportById(reportId: string) {
    logger.debug(`MCP Resource: debug://reports/${reportId}`);

    const report = await this.reportStorage.getReport(reportId);

    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    return report;
  }

  /**
   * Get screenshot by ID
   */
  async getScreenshotById(reportId: string) {
    logger.debug(`MCP Resource: debug://screenshots/${reportId}`);

    const screenshot = await this.screenshotStorage.getScreenshot(reportId);

    if (!screenshot) {
      throw new Error(`Screenshot not found: ${reportId}`);
    }

    return screenshot;
  }
}
