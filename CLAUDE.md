# CLAUDE.md - Debug MCP Server Project Constitution

This file defines the rules, patterns, and guidelines that Claude Code must follow when working on this project.

## Project Overview

**Debug MCP Server** - An MCP (Model Context Protocol) server that bridges web browsers and Claude Code for seamless debugging workflows.

### Project Scope

This project is focused on:

- Receiving debug data from browser widgets (logs, errors, screenshots)
- Exposing debug data to Claude Code via MCP protocol
- Facilitating interactive Q&A between Claude Code and browser users
- Storing and managing debug reports on local filesystem

**Out of scope:** Authentication, remote access, cloud deployment, multi-user support, database storage

### Tech Stack

- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.x
- **MCP SDK**: @modelcontextprotocol/sdk
- **Server**: Express.js (HTTP/REST)
- **Real-time**: ws (WebSocket)
- **File Storage**: Node.js fs module
- **Testing**: Jest
- **Build**: tsc (TypeScript compiler)

---

## Development Workflow: SpecKit First

**ALWAYS use SpecKit before implementing any new feature.**

### Feature Development Process

```text
1. DISCUSS    →  2. SPEC      →  3. BUILD     →  4. SHIP
   (Clarify)      (SpecKit)      (Implement)     (Deploy)
```

---

## Core Principles

### 1. MCP-First Architecture

**All functionality must be exposed through MCP protocol.**

- MCP tools are the primary interface (not HTTP endpoints)
- HTTP/WebSocket are secondary interfaces for browser communication
- Follow MCP SDK best practices and conventions

### 2. Localhost Only

**This server runs on localhost for security.**

- Never expose to external network
- No authentication needed (trusted local environment)
- Bind to 127.0.0.1, not 0.0.0.0

### 3. File-Based Storage

**Use filesystem for all data storage (no database).**

- Organized directory structure under `~/.debug-mcp/`
- JSON files for metadata
- PNG files for screenshots
- Keep it simple and human-readable

### 4. Error Handling

**Graceful degradation and helpful error messages.**

- Never crash the server
- Log all errors to console
- Return helpful error messages to clients
- Handle WebSocket disconnections gracefully

---

## Code Standards

### TypeScript

```typescript
// Use strict mode
"strict": true

// Explicit types, avoid 'any'
// Prefer interfaces over types for objects
// Use async/await over .then()
```

### File Organization

```text
debug-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── mcp/                  # MCP server implementation
│   │   ├── server.ts         # MCP server setup
│   │   ├── tools.ts          # MCP tools definitions
│   │   └── resources.ts      # MCP resources definitions
│   ├── http/                 # HTTP/WebSocket servers
│   │   ├── server.ts         # Express server
│   │   ├── routes.ts         # API routes
│   │   └── websocket.ts      # WebSocket handler
│   ├── storage/              # File storage layer
│   │   ├── reports.ts        # Debug report storage
│   │   ├── screenshots.ts    # Screenshot storage
│   │   └── questions.ts      # Q&A session storage
│   ├── types/                # TypeScript types
│   │   └── index.ts
│   └── config/               # Configuration
│       └── index.ts
├── specs/                    # SpecKit specifications
├── tests/                    # Jest tests
├── package.json
├── tsconfig.json
└── CLAUDE.md
```

### Naming Conventions

- **Files**: kebab-case (`debug-report.ts`)
- **Classes**: PascalCase (`DebugReportStorage`)
- **Functions**: camelCase (`storeDebugReport`)
- **Constants**: SCREAMING_SNAKE (`DEFAULT_STORAGE_PATH`)

---

## MCP Tools Design

### Tool Naming

Use clear, action-oriented names:
- `submit_debug_report` (not `create_report`)
- `list_debug_reports` (not `get_all`)
- `ask_user_questions` (not `send_questions`)

### Tool Responses

Always return structured data:

```typescript
// Success
{
  success: true,
  data: { ... }
}

// Error
{
  success: false,
  error: "Clear error message",
  code: "ERROR_CODE"
}
```

---

## HTTP API Design

### Endpoints

```
POST /api/debug              # Receive debug data from browser
POST /api/questions/answer   # Receive answers from browser
GET  /api/health             # Health check
```

### CORS

- Allow `http://localhost:*` and `http://127.0.0.1:*`
- No other origins (security)

---

## WebSocket Protocol

### Message Format

```typescript
// Server → Browser (questions)
{
  type: 'questions',
  sessionId: string,
  questions: Question[]
}

// Browser → Server (answers) - use HTTP POST instead
```

---

## Configuration

Configuration is loaded from:
1. Environment variables (highest priority)
2. `~/.debug-mcp/config.json`
3. Default values (fallback)

### Environment Variables

- `DEBUG_MCP_PORT` - HTTP server port (default: 3000)
- `DEBUG_MCP_STORAGE_PATH` - Storage directory (default: `~/.debug-mcp`)
- `DEBUG_MCP_RETENTION_DAYS` - Report retention period (default: 7)

---

## Testing Requirements

- Unit tests for all storage functions
- Integration tests for MCP tools
- E2E tests for HTTP/WebSocket flows
- Minimum 80% code coverage

---

## What NOT to Do

- Don't add authentication/authorization
- Don't use database (file-based only)
- Don't expose server to external network
- Don't use complex frameworks (keep it simple)
- Don't add features outside the spec without discussion

---

## Build Commands

```bash
# Install dependencies
npm install

# Development (watch mode)
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Start production
npm start
```

---

## Deployment

This is a local development tool:
- Users install globally: `npm install -g @yourco/debug-mcp-server`
- Or run via npx: `npx @yourco/debug-mcp-server`
- Server runs in background during development

---

## Bug Fixes and Problem Solving

### Use SpecKit for Significant Fixes

For non-trivial bug fixes that require design changes or architectural updates:

1. Create a feature spec with `/speckit.specify "Fix: [description]"`
2. Plan the fix with `/speckit.plan`
3. Implement following SpecKit workflow

For simple one-line fixes, SpecKit is not required.

### Knowledge Base System

This project has a **continuously growing knowledge base** at `src/lib/knowledgebase/` that stores solutions to problems discovered during development.

#### CRITICAL: Always Search KB First

**BEFORE attempting to fix any error**, check the knowledge base:

1. Read `src/lib/knowledgebase/entries.ts`
2. Search for the error message or related keywords
3. If a solution exists, apply it directly
4. If no solution exists, solve the problem and ADD it to the KB

#### When to Search the KB

Search the KB first when encountering:
- Build errors or deployment failures
- TypeScript compilation errors
- MCP SDK errors or protocol issues
- WebSocket connection errors
- File system permission errors
- Node.js specific errors
- Any error message you've seen before

#### How to Add New Solutions

After solving any non-trivial problem:

1. Add a new entry to `src/lib/knowledgebase/entries.ts`
2. Follow this format:

```typescript
{
  id: '{category}-{number}',  // e.g., 'mcp-001'
  category: 'mcp' | 'nodejs' | 'typescript' | 'websocket' | 'filesystem' | 'general',
  title: 'Short descriptive title',
  problem: 'Detailed description of when this occurs',
  errorMessages: ['exact error messages that trigger this'],
  solution: 'Step-by-step solution',
  codeExample: `// Working code example`,
  relatedFiles: ['src/path/to/file.ts'],
  tags: ['searchable', 'keywords'],
  dateAdded: 'YYYY-MM-DD',
}
```

#### Session Logging

All chat sessions are logged to `logs/session_YYYY-MM-DD-{topic}.md` with:
- Issues encountered and their solutions
- Code changes made
- Decisions and rationale
- Links to related files and KB entries

---

## Recent Changes

- 2025-11-26: Initial project setup with SpecKit specifications
- 2025-11-26: Added knowledge base system and SpecKit fix workflow
