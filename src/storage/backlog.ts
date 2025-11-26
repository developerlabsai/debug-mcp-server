/**
 * Backlog storage for queued debug reports
 *
 * Stores debug reports that are set to "backlog" mode for later review.
 */

import { writeFile, readFile, readdir, rm } from 'fs/promises';
import { join } from 'path';
import { ensureDir } from '../lib/utils.js';
import * as logger from '../lib/logger.js';

export interface BacklogItem {
  id: string;
  reportId: string;
  projectPath?: string;
  comment: string;
  url: string;
  timestamp: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  createdAt: number;
  updatedAt: number;
}

export class BacklogStorage {
  constructor(private storagePath: string) {}

  /**
   * Get backlog directory path
   */
  private getBacklogDir(): string {
    return join(this.storagePath, 'backlog');
  }

  /**
   * Get file path for a specific backlog item
   */
  private getItemPath(itemId: string): string {
    return join(this.getBacklogDir(), `backlog-${itemId}.json`);
  }

  /**
   * Add an item to the backlog
   */
  async addItem(item: Omit<BacklogItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<BacklogItem> {
    const now = Date.now();
    const fullItem: BacklogItem = {
      ...item,
      id: `bl-${now}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    const filePath = this.getItemPath(fullItem.id);
    await writeFile(filePath, JSON.stringify(fullItem, null, 2), 'utf-8');

    logger.info(`Added backlog item: ${fullItem.id}`);
    return fullItem;
  }

  /**
   * Get a specific backlog item
   */
  async getItem(itemId: string): Promise<BacklogItem | null> {
    try {
      const filePath = this.getItemPath(itemId);
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as BacklogItem;
    } catch {
      return null;
    }
  }

  /**
   * Update a backlog item
   */
  async updateItem(itemId: string, updates: Partial<Omit<BacklogItem, 'id' | 'createdAt'>>): Promise<BacklogItem | null> {
    const item = await this.getItem(itemId);
    if (!item) {
      return null;
    }

    const updatedItem: BacklogItem = {
      ...item,
      ...updates,
      updatedAt: Date.now(),
    };

    const filePath = this.getItemPath(itemId);
    await writeFile(filePath, JSON.stringify(updatedItem, null, 2), 'utf-8');

    logger.info(`Updated backlog item: ${itemId}`);
    return updatedItem;
  }

  /**
   * Remove an item from the backlog
   */
  async removeItem(itemId: string): Promise<boolean> {
    try {
      const filePath = this.getItemPath(itemId);
      await rm(filePath);
      logger.info(`Removed backlog item: ${itemId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all backlog items
   */
  async listItems(options?: {
    status?: BacklogItem['status'];
    priority?: BacklogItem['priority'];
    projectPath?: string;
    limit?: number;
  }): Promise<BacklogItem[]> {
    const items: BacklogItem[] = [];

    try {
      const backlogDir = this.getBacklogDir();
      const files = await readdir(backlogDir);

      for (const file of files) {
        if (file.startsWith('backlog-') && file.endsWith('.json')) {
          try {
            const content = await readFile(join(backlogDir, file), 'utf-8');
            const item = JSON.parse(content) as BacklogItem;

            // Apply filters
            if (options?.status && item.status !== options.status) continue;
            if (options?.priority && item.priority !== options.priority) continue;
            if (options?.projectPath && item.projectPath !== options.projectPath) continue;

            items.push(item);
          } catch (error) {
            logger.warn(`Failed to read backlog file: ${file}`, error);
          }
        }
      }

      // Sort by priority (critical > high > medium > low) then by createdAt
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      items.sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt - a.createdAt; // Newest first within same priority
      });

      // Apply limit
      if (options?.limit) {
        return items.slice(0, options.limit);
      }

      return items;
    } catch (error) {
      logger.error('Error listing backlog items:', error);
      return [];
    }
  }

  /**
   * Get backlog statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<BacklogItem['status'], number>;
    byPriority: Record<BacklogItem['priority'], number>;
  }> {
    const items = await this.listItems();

    const byStatus: Record<BacklogItem['status'], number> = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      dismissed: 0,
    };

    const byPriority: Record<BacklogItem['priority'], number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const item of items) {
      byStatus[item.status]++;
      byPriority[item.priority]++;
    }

    return {
      total: items.length,
      byStatus,
      byPriority,
    };
  }

  /**
   * Clear resolved/dismissed items older than specified days
   */
  async cleanupOldItems(olderThanDays: number): Promise<number> {
    let deletedCount = 0;
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    try {
      const items = await this.listItems();

      for (const item of items) {
        if (
          (item.status === 'resolved' || item.status === 'dismissed') &&
          item.updatedAt < cutoffTime
        ) {
          await this.removeItem(item.id);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old backlog items`);
      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up backlog items:', error);
      return 0;
    }
  }

  /**
   * Initialize storage (create directories)
   */
  async initialize(): Promise<void> {
    await ensureDir(this.getBacklogDir());
    logger.info('Backlog storage initialized');
  }
}
