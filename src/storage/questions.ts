/**
 * Q&A session storage and management
 */

import type { QuestionSession, Question, Answer } from '../types/index.js';
import { generateId } from '../lib/utils.js';
import * as logger from '../lib/logger.js';

export class QuestionSessionManager {
  private sessions: Map<string, QuestionSession> = new Map();
  private resolvers: Map<string, (answers: Answer[]) => void> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create a new Q&A session
   */
  createSession(questions: Question[], timeoutMs: number = 120000): string {
    const sessionId = generateId(12);

    const session: QuestionSession = {
      id: sessionId,
      questions,
      answers: [],
      status: 'pending',
      createdAt: Date.now(),
      timeoutMs,
    };

    this.sessions.set(sessionId, session);

    // Set timeout
    const timeoutHandle = setTimeout(() => {
      this.timeoutSession(sessionId);
    }, timeoutMs);

    this.timeouts.set(sessionId, timeoutHandle);

    logger.info(`Created Q&A session: ${sessionId}`);

    return sessionId;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): QuestionSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Submit answers to a session
   */
  submitAnswers(sessionId: string, answers: Answer[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return false;
    }

    if (session.status !== 'pending') {
      logger.warn(`Session already ${session.status}: ${sessionId}`);
      return false;
    }

    // Update session
    session.answers = answers;
    session.status = 'answered';
    session.answeredAt = Date.now();

    // Clear timeout
    const timeoutHandle = this.timeouts.get(sessionId);
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      this.timeouts.delete(sessionId);
    }

    // Resolve promise if waiting
    const resolver = this.resolvers.get(sessionId);
    if (resolver) {
      resolver(answers);
      this.resolvers.delete(sessionId);
    }

    logger.info(`Answers submitted for session: ${sessionId}`);

    return true;
  }

  /**
   * Wait for answers to a session (returns promise)
   */
  async waitForAnswers(sessionId: string): Promise<Answer[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // If already answered, return immediately
    if (session.status === 'answered') {
      return session.answers;
    }

    // If timed out, throw error
    if (session.status === 'timeout') {
      throw new Error(`Session timed out: ${sessionId}`);
    }

    // Otherwise, wait for answers
    return new Promise((resolve, reject) => {
      this.resolvers.set(sessionId, resolve);

      // Also handle timeout
      setTimeout(() => {
        if (this.resolvers.has(sessionId)) {
          this.resolvers.delete(sessionId);
          reject(new Error(`Session timed out: ${sessionId}`));
        }
      }, session.timeoutMs);
    });
  }

  /**
   * Timeout a session
   */
  private timeoutSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'pending') {
      return;
    }

    session.status = 'timeout';

    const resolver = this.resolvers.get(sessionId);
    if (resolver) {
      // Resolver will handle rejection via timeout in waitForAnswers
      this.resolvers.delete(sessionId);
    }

    logger.warn(`Session timed out: ${sessionId}`);
  }

  /**
   * Clean up old sessions
   */
  cleanup(olderThanMs: number = 3600000): void {
    const cutoff = Date.now() - olderThanMs;
    let deletedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.createdAt < cutoff) {
        // Clear timeout if exists
        const timeoutHandle = this.timeouts.get(sessionId);
        if (timeoutHandle) {
          clearTimeout(timeoutHandle);
          this.timeouts.delete(sessionId);
        }

        this.sessions.delete(sessionId);
        this.resolvers.delete(sessionId);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old Q&A sessions`);
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return Array.from(this.sessions.values()).filter(s => s.status === 'pending').length;
  }
}
