# Debug MCP Server

An MCP (Model Context Protocol) server that bridges web browsers and Claude Code for seamless debugging workflows.

## Overview

This server receives debug data from browser widgets (console logs, error stacks, screenshots) and exposes it to Claude Code via the MCP protocol. It also facilitates interactive Q&A between Claude Code and browser users.

## Features

- **Debug Data Ingestion**: HTTP endpoints to receive debug reports from browsers
- **MCP Tools**: Expose debug data to Claude Code through MCP protocol
- **Interactive Q&A**: WebSocket-based bidirectional communication for clarification questions
- **File Storage**: Organized filesystem storage for reports and screenshots
- **Localhost Only**: Secure local-only server for development use

## Quick Start

### Installation

```bash
# Global installation
npm install -g @yourco/debug-mcp-server

# Or use npx
npx @yourco/debug-mcp-server
```

### Running the Server

```bash
# Start the server
debug-mcp-server

# Or with custom port
DEBUG_MCP_PORT=4000 debug-mcp-server
```

### Configuration

Create `~/.debug-mcp/config.json`:

```json
{
  "port": 3000,
  "storagePath": "~/.debug-mcp",
  "retentionDays": 7
}
```

Or use environment variables:

- `DEBUG_MCP_PORT` - HTTP server port (default: 3000)
- `DEBUG_MCP_STORAGE_PATH` - Storage directory (default: `~/.debug-mcp`)
- `DEBUG_MCP_RETENTION_DAYS` - Report retention period (default: 7)

## MCP Integration

### Connect Claude Code to Server

Add to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "debug-reports": {
      "command": "node",
      "args": ["/path/to/debug-mcp-server/dist/index.js"]
    }
  }
}
```

### Available MCP Tools

- `submit_debug_report` - Receive debug data from browser
- `list_debug_reports` - List all stored debug reports
- `get_debug_report` - Retrieve specific debug report by ID
- `ask_user_questions` - Send questions to browser and wait for answers
- `clear_old_reports` - Clean up old debug data

### Available MCP Resources

- `debug://reports/latest` - Get most recent debug report
- `debug://reports/{id}` - Get specific report by ID
- `debug://screenshots/{id}` - Access screenshot files

## API Endpoints

### POST /api/debug

Receive debug data from browser widget.

**Request Body:**

```json
{
  "logs": [
    { "level": "error", "message": "Error message", "timestamp": 1234567890 }
  ],
  "error": {
    "message": "TypeError: Cannot read property...",
    "stack": "Error stack trace..."
  },
  "screenshot": "data:image/png;base64,...",
  "comment": "User description of the issue",
  "url": "https://example.com/page",
  "timestamp": 1234567890
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "reportId": "abc123",
    "timestamp": 1234567890
  }
}
```

### POST /api/questions/answer

Receive answers from browser to Claude's questions.

**Request Body:**

```json
{
  "sessionId": "session-123",
  "answers": [
    { "questionId": "q1", "answer": "User's answer" }
  ]
}
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/yourco/debug-mcp-server.git
cd debug-mcp-server

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Project Structure

```
debug-mcp-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── mcp/                  # MCP server implementation
│   ├── http/                 # HTTP/WebSocket servers
│   ├── storage/              # File storage layer
│   ├── types/                # TypeScript types
│   └── config/               # Configuration
├── specs/                    # SpecKit specifications
├── tests/                    # Jest tests
└── logs/                     # Session logs
```

### Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run linter
npm run lint
```

### Building

```bash
# Build for production
npm run build

# Output: dist/index.js
```

## Architecture

```
┌─────────────────────┐
│  Browser Widget     │
│  (HTTP/WebSocket)   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────────────────────┐
│  Debug MCP Server                   │
│  ┌─────────────────────────────┐    │
│  │ HTTP Server (Express)       │    │
│  │  - POST /api/debug          │    │
│  │  - POST /api/questions      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ WebSocket Server            │    │
│  │  - Push questions to browser│    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ MCP Server                  │    │
│  │  - Tools & Resources        │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ File Storage                │    │
│  │  - ~/.debug-mcp/            │    │
│  └─────────────────────────────┘    │
└──────────┬──────────────────────────┘
           │
           ↓
┌─────────────────────┐
│  Claude Code        │
│  (VS Code)          │
└─────────────────────┘
```

## Storage Structure

```
~/.debug-mcp/
├── reports/
│   ├── 2025-11-26/
│   │   ├── report-abc123.json
│   │   └── report-def456.json
│   └── 2025-11-27/
│       └── report-ghi789.json
├── screenshots/
│   ├── screenshot-abc123.png
│   └── screenshot-def456.png
└── config.json
```

## Troubleshooting

### Server won't start

Check if port is already in use:

```bash
lsof -i :3000
```

Use a different port:

```bash
DEBUG_MCP_PORT=4000 debug-mcp-server
```

### Claude Code can't connect

1. Verify server is running: `curl http://localhost:3000/api/health`
2. Check MCP configuration in Claude Code settings
3. Restart VS Code after config changes

### Browser widget can't send data

1. Verify server is running on localhost:3000
2. Check browser console for CORS errors
3. Ensure browser has network access to localhost

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and project constitution.

## License

MIT

## Support

For issues and feature requests, please open an issue on GitHub.
