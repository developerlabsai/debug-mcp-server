/**
 * Simple logger utility
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLogLevel: LogLevel = 'info';

/**
 * Set the log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

/**
 * Check if a log level should be output
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLogLevel];
}

/**
 * Format timestamp
 */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Debug log
 */
export function debug(message: string, ...args: unknown[]): void {
  if (shouldLog('debug')) {
    console.log(`[${timestamp()}] DEBUG:`, message, ...args);
  }
}

/**
 * Info log
 */
export function info(message: string, ...args: unknown[]): void {
  if (shouldLog('info')) {
    console.log(`[${timestamp()}] INFO:`, message, ...args);
  }
}

/**
 * Warning log
 */
export function warn(message: string, ...args: unknown[]): void {
  if (shouldLog('warn')) {
    console.warn(`[${timestamp()}] WARN:`, message, ...args);
  }
}

/**
 * Error log
 */
export function error(message: string, ...args: unknown[]): void {
  if (shouldLog('error')) {
    console.error(`[${timestamp()}] ERROR:`, message, ...args);
  }
}
