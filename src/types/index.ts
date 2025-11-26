/**
 * Core type definitions for Debug MCP Server
 */

// Debug Report Types

export interface LogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
  stack?: string;  // For errors
}

export interface ErrorInfo {
  message: string;
  stack: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface AttachedFile {
  filename: string;
  content: string;  // base64 encoded
  mimeType: string;
}

export interface DebugReport {
  id: string;                    // Unique ID
  timestamp: number;             // Unix timestamp
  url: string;                   // Page URL
  userAgent: string;             // Browser user agent
  logs: LogEntry[];              // Console logs
  error?: ErrorInfo;             // JavaScript error
  screenshot?: string;           // Filename (e.g., "screenshot-abc123.png")
  comment: string;               // User description
  files?: AttachedFile[];        // Uploaded files
}

// Q&A Session Types

export type QuestionType = 'text' | 'multipleChoice' | 'boolean';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];            // For multipleChoice
  required: boolean;
}

export interface Answer {
  questionId: string;
  answer: string;
  timestamp: number;
}

export type SessionStatus = 'pending' | 'answered' | 'timeout';

export interface QuestionSession {
  id: string;
  questions: Question[];
  answers: Answer[];
  status: SessionStatus;
  createdAt: number;
  answeredAt?: number;
  timeoutMs: number;
}

// Configuration Types

export interface ServerConfig {
  port: number;
  storagePath: string;
  retentionDays: number;
  maxReportSize: number;        // bytes
  maxScreenshotSize: number;    // bytes
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// API Request/Response Types

export interface SubmitDebugReportRequest {
  logs: LogEntry[];
  error?: ErrorInfo;
  screenshot?: string;           // base64 data URI
  comment: string;
  url: string;
  timestamp: number;
  userAgent?: string;
  files?: AttachedFile[];
}

export interface SubmitDebugReportResponse {
  success: true;
  data: {
    reportId: string;
    timestamp: number;
    sessionId?: string; // Q&A session ID if auto-questions enabled
  };
}

export interface SubmitAnswersRequest {
  sessionId: string;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
}

export interface SubmitAnswersResponse {
  success: true;
  data: {
    sessionId: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

export type ApiResponse<T = unknown> = T | ErrorResponse;

// MCP Tool Types

export interface ListDebugReportsResult {
  reports: Array<{
    id: string;
    timestamp: number;
    url: string;
    hasError: boolean;
    hasScreenshot: boolean;
    comment: string;
  }>;
}

export interface GetDebugReportParams {
  id: string;
}

export interface AskUserQuestionsParams {
  questions: Question[];
  timeout?: number;  // milliseconds
}

export interface AskUserQuestionsResult {
  answers: Answer[];
}

export interface ClearOldReportsParams {
  olderThanDays?: number;
}

export interface ClearOldReportsResult {
  deletedCount: number;
  freedBytes: number;
}

// WebSocket Message Types

export interface WebSocketMessage {
  type: string;
  data: unknown;
}

export interface QuestionsMessage extends WebSocketMessage {
  type: 'questions';
  data: {
    sessionId: string;
    questions: Question[];
  };
}

// Backlog Types

export type BacklogPriority = 'critical' | 'high' | 'medium' | 'low';
export type BacklogStatus = 'pending' | 'in_progress' | 'resolved' | 'dismissed';

export interface BacklogItem {
  id: string;
  reportId: string;
  projectPath?: string;
  comment: string;
  url: string;
  timestamp: number;
  priority: BacklogPriority;
  status: BacklogStatus;
  createdAt: number;
  updatedAt: number;
}

export interface ListBacklogParams {
  status?: BacklogStatus;
  priority?: BacklogPriority;
  projectPath?: string;
  limit?: number;
}

export interface ListBacklogResult {
  items: BacklogItem[];
  stats: {
    total: number;
    byStatus: Record<BacklogStatus, number>;
    byPriority: Record<BacklogPriority, number>;
  };
}

export interface AddToBacklogParams {
  reportId: string;
  projectPath?: string;
  comment: string;
  url: string;
  timestamp: number;
  priority?: BacklogPriority;
}

export interface UpdateBacklogItemParams {
  id: string;
  status?: BacklogStatus;
  priority?: BacklogPriority;
  comment?: string;
}

export interface ProcessBacklogItemParams {
  id: string;
}

// Utility Types

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };
