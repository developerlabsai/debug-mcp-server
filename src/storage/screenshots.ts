/**
 * Screenshot storage and retrieval
 */

import { writeFile, readFile, rm, stat } from 'fs/promises';
import { join } from 'path';
import { ensureDir, extractBase64 } from '../lib/utils.js';
import * as logger from '../lib/logger.js';

export class ScreenshotStorage {
  constructor(private storagePath: string) {}

  /**
   * Get screenshots directory path
   */
  private getScreenshotsDir(): string {
    return join(this.storagePath, 'screenshots');
  }

  /**
   * Get file path for a specific screenshot
   */
  private getScreenshotPath(reportId: string): string {
    return join(this.getScreenshotsDir(), `screenshot-${reportId}.png`);
  }

  /**
   * Save a screenshot from base64 data URI
   */
  async saveScreenshot(reportId: string, dataUri: string): Promise<string> {
    const screenshotsDir = this.getScreenshotsDir();
    await ensureDir(screenshotsDir);

    const extracted = extractBase64(dataUri);
    if (!extracted) {
      throw new Error('Invalid base64 data URI');
    }

    const { data, mimeType } = extracted;

    // Validate it's an image
    if (!mimeType.startsWith('image/')) {
      throw new Error(`Invalid MIME type: ${mimeType}. Expected image/*`);
    }

    const filePath = this.getScreenshotPath(reportId);
    await writeFile(filePath, data);

    logger.info(`Saved screenshot for report: ${reportId}`);

    return `screenshot-${reportId}.png`;
  }

  /**
   * Get a screenshot by report ID
   */
  async getScreenshot(reportId: string): Promise<Buffer | null> {
    try {
      const filePath = this.getScreenshotPath(reportId);
      return await readFile(filePath);
    } catch (error) {
      logger.warn(`Screenshot not found for report: ${reportId}`);
      return null;
    }
  }

  /**
   * Delete a screenshot
   */
  async deleteScreenshot(reportId: string): Promise<boolean> {
    try {
      const filePath = this.getScreenshotPath(reportId);
      await rm(filePath);
      logger.info(`Deleted screenshot for report: ${reportId}`);
      return true;
    } catch (error) {
      logger.warn(`Failed to delete screenshot for report: ${reportId}`, error);
      return false;
    }
  }

  /**
   * Get screenshot file size
   */
  async getScreenshotSize(reportId: string): Promise<number> {
    try {
      const filePath = this.getScreenshotPath(reportId);
      const stats = await stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Initialize storage (create directories)
   */
  async initialize(): Promise<void> {
    await ensureDir(this.getScreenshotsDir());
    logger.info('Screenshot storage initialized');
  }
}
