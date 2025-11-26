/**
 * Debug report storage and retrieval
 */

import { writeFile, readFile, readdir, stat, rm } from 'fs/promises';
import { join } from 'path';
import type { DebugReport } from '../types/index.js';
import { ensureDir } from '../lib/utils.js';
import * as logger from '../lib/logger.js';

export class ReportStorage {
  constructor(private storagePath: string) {}

  /**
   * Get reports directory path
   */
  private getReportsDir(): string {
    return join(this.storagePath, 'reports');
  }

  /**
   * Get directory path for a specific date
   */
  private getDateDir(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return join(this.getReportsDir(), `${year}-${month}-${day}`);
  }

  /**
   * Get file path for a specific report
   */
  private getReportPath(reportId: string, date: Date): string {
    return join(this.getDateDir(date), `report-${reportId}.json`);
  }

  /**
   * Save a debug report
   */
  async saveReport(report: DebugReport): Promise<void> {
    const date = new Date(report.timestamp);
    const dir = this.getDateDir(date);

    // Ensure directory exists
    await ensureDir(dir);

    // Write report
    const filePath = this.getReportPath(report.id, date);
    await writeFile(filePath, JSON.stringify(report, null, 2), 'utf-8');

    logger.info(`Saved debug report: ${report.id}`);
  }

  /**
   * Get a debug report by ID
   */
  async getReport(reportId: string): Promise<DebugReport | null> {
    try {
      // Search through date directories
      const reportsDir = this.getReportsDir();
      const dateDirs = await readdir(reportsDir);

      for (const dateDir of dateDirs) {
        const reportPath = join(reportsDir, dateDir, `report-${reportId}.json`);
        try {
          const content = await readFile(reportPath, 'utf-8');
          return JSON.parse(content) as DebugReport;
        } catch {
          // File doesn't exist in this directory, continue searching
          continue;
        }
      }

      return null;
    } catch (error) {
      logger.error('Error getting report:', error);
      return null;
    }
  }

  /**
   * List all debug reports
   */
  async listReports(): Promise<Array<{
    id: string;
    timestamp: number;
    url: string;
    hasError: boolean;
    hasScreenshot: boolean;
    comment: string;
  }>> {
    const reports: Array<{
      id: string;
      timestamp: number;
      url: string;
      hasError: boolean;
      hasScreenshot: boolean;
      comment: string;
    }> = [];

    try {
      const reportsDir = this.getReportsDir();
      const dateDirs = await readdir(reportsDir);

      for (const dateDir of dateDirs) {
        const dateDirPath = join(reportsDir, dateDir);
        const files = await readdir(dateDirPath);

        for (const file of files) {
          if (file.startsWith('report-') && file.endsWith('.json')) {
            try {
              const content = await readFile(join(dateDirPath, file), 'utf-8');
              const report = JSON.parse(content) as DebugReport;

              reports.push({
                id: report.id,
                timestamp: report.timestamp,
                url: report.url,
                hasError: !!report.error,
                hasScreenshot: !!report.screenshot,
                comment: report.comment,
              });
            } catch (error) {
              logger.warn(`Failed to read report file: ${file}`, error);
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      reports.sort((a, b) => b.timestamp - a.timestamp);

      return reports;
    } catch (error) {
      logger.error('Error listing reports:', error);
      return [];
    }
  }

  /**
   * Get the latest debug report
   */
  async getLatestReport(): Promise<DebugReport | null> {
    const reports = await this.listReports();
    if (reports.length === 0) {
      return null;
    }

    const latest = reports[0];
    return this.getReport(latest.id);
  }

  /**
   * Delete reports older than specified days
   */
  async deleteOldReports(olderThanDays: number): Promise<{ deletedCount: number; freedBytes: number }> {
    let deletedCount = 0;
    let freedBytes = 0;

    try {
      const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      const reportsDir = this.getReportsDir();
      const dateDirs = await readdir(reportsDir);

      for (const dateDir of dateDirs) {
        const dateDirPath = join(reportsDir, dateDir);
        const files = await readdir(dateDirPath);

        for (const file of files) {
          if (file.startsWith('report-') && file.endsWith('.json')) {
            const filePath = join(dateDirPath, file);

            try {
              const content = await readFile(filePath, 'utf-8');
              const report = JSON.parse(content) as DebugReport;

              if (report.timestamp < cutoffDate) {
                // Get file size before deleting
                const stats = await stat(filePath);
                freedBytes += stats.size;

                // Delete report file
                await rm(filePath);
                deletedCount++;

                logger.info(`Deleted old report: ${report.id}`);
              }
            } catch (error) {
              logger.warn(`Failed to process report file: ${file}`, error);
            }
          }
        }

        // Remove empty date directories
        const remainingFiles = await readdir(dateDirPath);
        if (remainingFiles.length === 0) {
          await rm(dateDirPath, { recursive: true });
        }
      }

      logger.info(`Deleted ${deletedCount} old reports, freed ${freedBytes} bytes`);

      return { deletedCount, freedBytes };
    } catch (error) {
      logger.error('Error deleting old reports:', error);
      return { deletedCount: 0, freedBytes: 0 };
    }
  }

  /**
   * Initialize storage (create directories)
   */
  async initialize(): Promise<void> {
    await ensureDir(this.getReportsDir());
    logger.info('Report storage initialized');
  }
}
