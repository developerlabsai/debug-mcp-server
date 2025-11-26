#!/usr/bin/env node

/**
 * Debug MCP Server - Entry Point
 *
 * This server bridges web browsers and Claude Code for seamless debugging workflows.
 */

import { createServer } from 'http';
import { loadConfig } from './config/index.js';
import { ReportStorage } from './storage/reports.js';
import { ScreenshotStorage } from './storage/screenshots.js';
import { QuestionSessionManager } from './storage/questions.js';
import { BacklogStorage } from './storage/backlog.js';
import { MCPTools } from './mcp/tools.js';
import { MCPResources } from './mcp/resources.js';
import { MCPServerManager } from './mcp/server.js';
import { HTTPServer } from './http/server.js';
import { WSServer } from './websocket/server.js';
import * as logger from './lib/logger.js';

async function main() {
  try {
    // Load configuration
    logger.info('Loading configuration...');
    const config = await loadConfig();
    logger.setLogLevel(config.logLevel);

    logger.info('Debug MCP Server starting...');
    logger.info(`Port: ${config.port}`);
    logger.info(`Storage: ${config.storagePath}`);
    logger.info(`Retention: ${config.retentionDays} days`);

    // Initialize storage
    logger.info('Initializing storage...');
    const reportStorage = new ReportStorage(config.storagePath);
    const screenshotStorage = new ScreenshotStorage(config.storagePath);
    const backlogStorage = new BacklogStorage(config.storagePath);
    const questionManager = new QuestionSessionManager();

    await reportStorage.initialize();
    await screenshotStorage.initialize();
    await backlogStorage.initialize();

    // Create underlying HTTP server first (needed for both HTTP and WebSocket)
    const underlyingServer = createServer();

    // Initialize WebSocket server first (so we can pass notifier to HTTP routes)
    const wsServer = new WSServer(underlyingServer, questionManager);

    // Initialize HTTP server with auto-question notifier and backlog storage
    const httpServer = new HTTPServer(
      config,
      reportStorage,
      screenshotStorage,
      questionManager,
      (sessionId: string) => wsServer.pushQuestions(sessionId), // Auto-send questions on debug report
      backlogStorage
    );

    // Attach Express app to underlying server
    const app = httpServer.getApp();
    underlyingServer.on('request', app);

    // Initialize MCP tools and resources
    const mcpTools = new MCPTools(
      reportStorage,
      questionManager,
      (sessionId: string) => wsServer.pushQuestions(sessionId),
      backlogStorage
    );
    const mcpResources = new MCPResources(reportStorage, screenshotStorage);

    // Start HTTP server on underlying server
    await new Promise<void>((resolve) => {
      underlyingServer.listen(config.port, '127.0.0.1', () => {
        logger.info(`HTTP server listening on http://127.0.0.1:${config.port}`);
        logger.info(`WebSocket server ready on ws://127.0.0.1:${config.port}`);
        resolve();
      });
    });

    await wsServer.start();

    // Initialize MCP server (stdio-based for Claude Code)
    const mcpServer = new MCPServerManager(mcpTools, mcpResources);
    await mcpServer.start();

    // Cleanup old sessions periodically
    setInterval(() => {
      questionManager.cleanup();
    }, 3600000); // Every hour

    // Cleanup old reports on startup
    logger.info('Cleaning up old reports...');
    const { deletedCount, freedBytes } = await reportStorage.deleteOldReports(config.retentionDays);
    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old reports, freed ${Math.round(freedBytes / 1024)}KB`);
    }

    // Cleanup old resolved/dismissed backlog items
    const backlogCleanupCount = await backlogStorage.cleanupOldItems(config.retentionDays);
    if (backlogCleanupCount > 0) {
      logger.info(`Cleaned up ${backlogCleanupCount} old backlog items`);
    }

    logger.info('✅ Debug MCP Server ready!');
    logger.info('Waiting for connections...');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      logger.info('Shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('Shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
