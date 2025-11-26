# Implementation Plan: Debug MCP Server

**Branch**: `001-core-mcp-server` | **Date**: 2025-11-26 | **Spec**: [spec.md](./spec.md)

## Summary

Build an MCP server that receives debug data from browser widgets (console logs, error stacks, screenshots) and exposes it to Claude Code via MCP protocol. The server facilitates interactive Q&A between Claude and browser users through WebSocket connections. All data is stored locally in organized filesystem structure.

**Primary Goals:**
- Accept debug data via HTTP POST from browsers
- Expose debug data to Claude Code via MCP tools and resources
- Push questions to browser and receive answers via WebSocket
- Store reports and screenshots in `~/.debug-mcp/`

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x
**Primary Dependencies**:
- @modelcontextprotocol/sdk (MCP protocol)
- express (HTTP server)
- ws (WebSocket server)
- Node.js fs/promises (file storage)

**Storage**: Filesystem (`~/.debug-mcp/`) with JSON files for metadata, PNG for screenshots
**Testing**: Jest for unit/integration tests
**Target Platform**: Localhost only (127.0.0.1), macOS/Linux/Windows
**Project Type**: Single Node.js server application
**Performance Goals**:
- Handle 10 concurrent WebSocket connections
- Store reports in <100ms
- MCP tool responses in <500ms

**Constraints**:
- Localhost only (no external network exposure)
- No authentication (trusted local environment)
- File-based storage only (no database)
- Single developer use case

**Scale/Scope**:
- ~10 MCP tools
- ~3 MCP resources
- ~5 HTTP endpoints
- ~1000 LOC estimated

## Constitution Check

✅ **Passes all requirements:**
- MCP-first architecture (all features exposed via MCP)
- Localhost only (security)
- File-based storage (simplicity)
- TypeScript strict mode
- Error handling with graceful degradation

## Project Structure

### Documentation (this feature)

```text
specs/001-core-mcp-server/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task breakdown (to be created)
```

### Source Code

```text
debug-mcp-server/
├── src/
│   ├── index.ts              # Entry point, starts all servers
│   ├── mcp/
│   │   ├── server.ts         # MCP server initialization
│   │   ├── tools.ts          # MCP tools implementation
│   │   └── resources.ts      # MCP resources implementation
│   ├── http/
│   │   ├── server.ts         # Express HTTP server setup
│   │   ├── routes.ts         # API route handlers
│   │   └── middleware.ts     # CORS, error handling
│   ├── websocket/
│   │   ├── server.ts         # WebSocket server setup
│   │   └── sessions.ts       # Q&A session management
│   ├── storage/
│   │   ├── reports.ts        # Debug report storage/retrieval
│   │   ├── screenshots.ts    # Screenshot file handling
│   │   ├── questions.ts      # Q&A session storage
│   │   └── cleanup.ts        # Old report cleanup
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── config/
│   │   └── index.ts          # Configuration loading
│   └── lib/
│       ├── logger.ts         # Logging utility
│       └── utils.ts          # Helper functions
├── tests/
│   ├── unit/
│   │   ├── storage.test.ts
│   │   └── tools.test.ts
│   └── integration/
│       └── mcp-server.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Structure Decision**: Single Node.js application with clear separation between MCP, HTTP, and WebSocket servers. Storage layer abstracts filesystem operations. All servers share common types and configuration.

## Implementation Phases

### Phase 1: Core Infrastructure (P1)

**Goal**: Set up project foundation and basic MCP server

**Tasks**:
1. Initialize project with TypeScript, dependencies
2. Configure tsconfig.json for strict mode
3. Create type definitions for debug reports, questions, answers
4. Implement configuration loader (env vars + config file)
5. Set up MCP server with basic health check tool
6. Create storage directory structure (`~/.debug-mcp/`)

**Deliverable**: Running MCP server that Claude Code can connect to

**Acceptance**:
- `npm run build` succeeds
- MCP server starts without errors
- Claude Code can connect via MCP configuration

---

### Phase 2: Debug Data Ingestion (P1)

**Goal**: Accept debug reports from browsers via HTTP

**Tasks**:
1. Create Express HTTP server with CORS middleware
2. Implement POST `/api/debug` endpoint
3. Validate incoming debug report payload
4. Extract and save base64 screenshots as PNG files
5. Store debug report metadata as JSON
6. Return report ID to browser

**Deliverable**: HTTP API that accepts and stores debug reports

**Acceptance**:
- cURL POST to `/api/debug` succeeds
- Report JSON saved to `~/.debug-mcp/reports/YYYY-MM-DD/report-{id}.json`
- Screenshot saved to `~/.debug-mcp/screenshots/screenshot-{id}.png`

---

### Phase 3: MCP Tools for Claude Code (P1)

**Goal**: Expose stored debug data to Claude Code

**Tasks**:
1. Implement `list_debug_reports` tool (returns all reports)
2. Implement `get_debug_report` tool (returns specific report by ID)
3. Implement MCP resource `debug://reports/latest`
4. Implement MCP resource `debug://reports/{id}`
5. Implement MCP resource `debug://screenshots/{id}`

**Deliverable**: Claude Code can query debug reports via MCP

**Acceptance**:
- Claude can call `list_debug_reports` and see stored reports
- Claude can call `get_debug_report` with ID and get full report
- Claude can access screenshots via resources

---

### Phase 4: Interactive Q&A (P2)

**Goal**: Enable Claude to ask questions and receive answers

**Tasks**:
1. Create WebSocket server on same port (upgrade from HTTP)
2. Implement Q&A session manager (tracks active sessions)
3. Implement `ask_user_questions` MCP tool
4. Push questions to browser via WebSocket when tool is called
5. Implement POST `/api/questions/answer` endpoint
6. Return answers to Claude's waiting MCP tool call

**Deliverable**: Full Q&A flow from Claude → Browser → Claude

**Acceptance**:
- Claude calls `ask_user_questions` with question list
- Browser receives questions via WebSocket
- Browser sends answers via HTTP POST
- Claude receives answers and continues

---

### Phase 5: Report Management (P3)

**Goal**: Cleanup and management utilities

**Tasks**:
1. Implement `clear_old_reports` MCP tool
2. Add retention period logic (delete reports older than N days)
3. Implement report statistics (count, size, etc.)
4. Add health check endpoint `/api/health`

**Deliverable**: Cleanup and monitoring capabilities

**Acceptance**:
- Claude can call `clear_old_reports` to cleanup
- Old reports are automatically deleted based on retention period
- Health endpoint returns server status

---

## Data Models

### Debug Report

```typescript
interface DebugReport {
  id: string;                    // Unique ID (e.g., "abc123")
  timestamp: number;             // Unix timestamp
  url: string;                   // Page URL where error occurred
  userAgent: string;             // Browser user agent
  logs: LogEntry[];              // Console logs
  error?: ErrorInfo;             // JavaScript error (if any)
  screenshot?: string;           // Filename (e.g., "screenshot-abc123.png")
  comment: string;               // User's description
  files?: AttachedFile[];        // Uploaded files (optional)
}

interface LogEntry {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: number;
  stack?: string;                // For errors
}

interface ErrorInfo {
  message: string;
  stack: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}
```

### Q&A Session

```typescript
interface QuestionSession {
  id: string;                    // Session ID
  questions: Question[];         // Questions from Claude
  answers: Map<string, string>;  // Question ID → Answer
  status: 'pending' | 'answered' | 'timeout';
  createdAt: number;
  answeredAt?: number;
}

interface Question {
  id: string;
  text: string;
  type: 'text' | 'multipleChoice' | 'boolean';
  options?: string[];            // For multipleChoice
  required: boolean;
}
```

## API Contracts

### HTTP Endpoints

#### POST /api/debug

**Request:**
```typescript
{
  logs: LogEntry[];
  error?: ErrorInfo;
  screenshot?: string;          // base64 data URI
  comment: string;
  url: string;
  timestamp: number;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    reportId: string;
    timestamp: number;
  }
}
```

#### POST /api/questions/answer

**Request:**
```typescript
{
  sessionId: string;
  answers: Array<{
    questionId: string;
    answer: string;
  }>;
}
```

**Response:**
```typescript
{
  success: true;
  data: {
    sessionId: string;
  }
}
```

### MCP Tools

#### list_debug_reports

**Parameters:** None

**Returns:**
```typescript
{
  reports: Array<{
    id: string;
    timestamp: number;
    url: string;
    hasError: boolean;
    hasScreenshot: boolean;
  }>
}
```

#### get_debug_report

**Parameters:**
```typescript
{
  id: string;
}
```

**Returns:** Full `DebugReport` object

#### ask_user_questions

**Parameters:**
```typescript
{
  questions: Question[];
  timeout?: number;           // Default: 120000 (2 minutes)
}
```

**Returns:**
```typescript
{
  answers: Array<{
    questionId: string;
    answer: string;
  }>
}
```

### MCP Resources

- `debug://reports/latest` → Most recent DebugReport
- `debug://reports/{id}` → Specific DebugReport by ID
- `debug://screenshots/{id}` → Screenshot PNG file (binary)

## Configuration

### Environment Variables

- `DEBUG_MCP_PORT` - HTTP/WebSocket port (default: 3000)
- `DEBUG_MCP_STORAGE_PATH` - Storage directory (default: `~/.debug-mcp`)
- `DEBUG_MCP_RETENTION_DAYS` - Report retention (default: 7)
- `DEBUG_MCP_LOG_LEVEL` - Logging level (default: 'info')

### Config File

`~/.debug-mcp/config.json`:
```json
{
  "port": 3000,
  "storagePath": "~/.debug-mcp",
  "retentionDays": 7,
  "maxReportSize": 10485760,
  "maxScreenshotSize": 5242880
}
```

## Error Handling

### HTTP Errors

- 400 Bad Request: Invalid payload, missing required fields
- 413 Payload Too Large: Report or screenshot exceeds size limit
- 500 Internal Server Error: Storage failure, unexpected errors

All errors return:
```typescript
{
  success: false;
  error: string;
  code: string;
}
```

### MCP Tool Errors

- Return error in MCP protocol format
- Log error to console
- Never crash the server

### WebSocket Errors

- Reconnection logic handled by client
- Server logs disconnections
- Cleanup stale Q&A sessions after timeout

## Testing Strategy

### Unit Tests

- Storage functions (save, retrieve, delete)
- Configuration loader
- Data validation
- Screenshot extraction

### Integration Tests

- Full HTTP POST → Storage → MCP retrieval flow
- Q&A flow: MCP tool → WebSocket push → HTTP answer → MCP response
- Cleanup and retention logic

### Manual Testing

- Connect Claude Code to MCP server
- Send debug report from browser
- Verify Claude can retrieve and analyze report
- Test Q&A flow end-to-end

## Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "express": "^4.18.0",
    "ws": "^8.16.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0",
    "@types/cors": "^2.8.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

## Deployment

### Development

```bash
npm run dev    # Watch mode with nodemon
```

### Production

```bash
npm run build  # Compile TypeScript
npm start      # Run compiled JS
```

### Global Installation

```bash
npm install -g @yourco/debug-mcp-server
debug-mcp-server
```

## Success Criteria

From spec.md:

- ✅ **SC-001**: Developers can send debug data from browser to Claude Code in under 5 seconds
- ✅ **SC-002**: Claude Code can retrieve and analyze debug reports without any manual file sharing
- ✅ **SC-003**: Interactive Q&A flow completes from question asked to answer received in under 2 minutes
- ✅ **SC-004**: System handles at least 10 concurrent WebSocket connections without errors
- ✅ **SC-005**: Debug reports are stored in organized structure that's human-readable
- ✅ **SC-006**: System startup time is under 3 seconds
- ✅ **SC-007**: MCP tools respond to Claude Code requests in under 500ms
- ✅ **SC-008**: Screenshots up to 5MB are processed and stored successfully

## Open Questions

None - spec is complete and unambiguous.

## Next Steps

1. Run `/speckit.tasks` to generate task breakdown
2. Run `/speckit.implement` to execute implementation
3. Test with Claude Code and browser widget integration
