/**
 * Configuration management
 * Loads from environment variables, config file, or defaults
 */

import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import type { ServerConfig } from '../types/index.js';

const DEFAULT_CONFIG: ServerConfig = {
  port: 4000,
  storagePath: join(homedir(), '.debug-mcp'),
  retentionDays: 7,
  maxReportSize: 10 * 1024 * 1024,      // 10MB
  maxScreenshotSize: 5 * 1024 * 1024,   // 5MB
  logLevel: 'info',
};

/**
 * Load configuration from file if it exists
 */
async function loadConfigFile(storagePath: string): Promise<Partial<ServerConfig>> {
  try {
    const configPath = join(storagePath, 'config.json');
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Config file doesn't exist or is invalid - use defaults
    return {};
  }
}

/**
 * Load configuration from environment variables
 */
function loadEnvConfig(): Partial<ServerConfig> {
  const config: Partial<ServerConfig> = {};

  if (process.env.DEBUG_MCP_PORT) {
    config.port = parseInt(process.env.DEBUG_MCP_PORT, 10);
  }

  if (process.env.DEBUG_MCP_STORAGE_PATH) {
    config.storagePath = process.env.DEBUG_MCP_STORAGE_PATH;
  }

  if (process.env.DEBUG_MCP_RETENTION_DAYS) {
    config.retentionDays = parseInt(process.env.DEBUG_MCP_RETENTION_DAYS, 10);
  }

  if (process.env.DEBUG_MCP_LOG_LEVEL) {
    const level = process.env.DEBUG_MCP_LOG_LEVEL;
    if (level === 'debug' || level === 'info' || level === 'warn' || level === 'error') {
      config.logLevel = level;
    }
  }

  return config;
}

/**
 * Load and merge configuration from all sources
 * Priority: env vars > config file > defaults
 */
export async function loadConfig(): Promise<ServerConfig> {
  const envConfig = loadEnvConfig();

  // Use storage path from env or default to determine config file location
  const storagePath = envConfig.storagePath || DEFAULT_CONFIG.storagePath;
  const fileConfig = await loadConfigFile(storagePath);

  // Merge: defaults < file < env
  const config: ServerConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
  };

  return config;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): ServerConfig {
  return { ...DEFAULT_CONFIG };
}
