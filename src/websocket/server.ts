/**
 * WebSocket Server setup
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';
import type { QuestionSessionManager } from '../storage/questions.js';
import type { QuestionsMessage } from '../types/index.js';
import * as logger from '../lib/logger.js';

export class WSServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(
    httpServer: HTTPServer,
    private questionManager: QuestionSessionManager
  ) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.setupHandlers();
  }

  /**
   * Setup WebSocket handlers
   */
  private setupHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('WebSocket client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        data: { message: 'Connected to debug MCP server' },
      }));
    });
  }

  /**
   * Push questions to all connected clients
   */
  pushQuestions(sessionId: string): void {
    const session = this.questionManager.getSession(sessionId);

    if (!session) {
      logger.error(`Session not found: ${sessionId}`);
      return;
    }

    const message: QuestionsMessage = {
      type: 'questions',
      data: {
        sessionId,
        questions: session.questions,
      },
    };

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        sentCount++;
      }
    }

    logger.info(`Pushed questions to ${sentCount} clients (session: ${sessionId})`);

    if (sentCount === 0) {
      logger.warn('No connected clients to receive questions');
    }
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return Array.from(this.clients).filter(
      client => client.readyState === WebSocket.OPEN
    ).length;
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    logger.info('WebSocket server started');
  }
}
