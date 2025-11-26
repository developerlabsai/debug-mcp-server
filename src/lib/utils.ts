/**
 * Utility functions
 */

import { randomBytes } from 'crypto';

/**
 * Generate a random ID
 */
export function generateId(length = 8): string {
  return randomBytes(length).toString('hex').slice(0, length);
}

/**
 * Extract base64 data from data URI
 */
export function extractBase64(dataUri: string): { data: Buffer; mimeType: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const [, mimeType, base64Data] = match;
  const data = Buffer.from(base64Data, 'base64');

  return { data, mimeType };
}

/**
 * Ensure directory exists
 */
export async function ensureDir(path: string): Promise<void> {
  const { mkdir } = await import('fs/promises');
  await mkdir(path, { recursive: true });
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Sleep for a given duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
