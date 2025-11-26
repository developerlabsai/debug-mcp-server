# Feature Specification: Debug MCP Server

**Feature Branch**: `001-core-mcp-server`
**Created**: 2025-11-26
**Status**: Draft
**Input**: Build an MCP server that bridges web browsers and Claude Code for debugging

## User Scenarios & Testing

### User Story 1 - Capture and Store Debug Reports (Priority: P1)

A developer encounters a bug in their web application and wants to send debug information (console logs, error stack, screenshot) directly to Claude Code for analysis.

**Why this priority**: This is the core value proposition - developers waste significant time manually copying logs, taking screenshots, and organizing debug data. This story delivers immediate time savings.

**Independent Test**: Can be fully tested by sending a debug report via HTTP POST and verifying it's stored correctly in the filesystem. Delivers value by eliminating manual debug data collection.

**Acceptance Scenarios**:

1. **Given** browser widget sends debug data via HTTP POST, **When** MCP server receives the request, **Then** debug report is stored with unique ID and timestamp
2. **Given** debug report includes screenshot as base64, **When** server processes it, **Then** screenshot is saved as PNG file and referenced in report metadata
3. **Given** debug report includes console logs, **When** server receives them, **Then** logs are stored in structured format with timestamps and levels
4. **Given** multiple debug reports are submitted, **When** server stores them, **Then** each report has unique ID and organized file structure

---

### User Story 2 - Expose Debug Data to Claude Code (Priority: P1)

A developer wants Claude Code to analyze their most recent debug report without manually sharing files.

**Why this priority**: Without this, the MCP server is just a storage system. This enables the actual integration with Claude Code and delivers on the core promise.

**Independent Test**: Can be fully tested by submitting a debug report, then having Claude Code query it via MCP tools. Delivers value by providing seamless access to debug data.

**Acceptance Scenarios**:

1. **Given** Claude Code calls `list_debug_reports` tool, **When** MCP server responds, **Then** all stored reports are returned with metadata
2. **Given** Claude Code calls `get_debug_report` with ID, **When** MCP server processes request, **Then** full report including logs, error, screenshot path is returned
3. **Given** Claude Code accesses `debug://reports/latest` resource, **When** MCP server responds, **Then** most recent report is returned
4. **Given** Claude Code requests screenshot via `debug://screenshots/{id}`, **When** MCP server responds, **Then** screenshot file is served

---

### User Story 3 - Interactive Q&A with Browser User (Priority: P2)

Claude Code needs additional context about a bug and wants to ask the developer clarifying questions through a browser UI instead of VS Code chat.

**Why this priority**: This significantly enhances the debugging workflow by allowing Claude to gather context directly from the user in the browser where the error occurred, but it's not essential for basic functionality.

**Independent Test**: Can be fully tested by having Claude call `ask_user_questions` and verifying questions appear in browser UI, user answers, and answers return to Claude. Delivers value by streamlining the clarification process.

**Acceptance Scenarios**:

1. **Given** Claude Code calls `ask_user_questions` with question list, **When** MCP server processes request, **Then** questions are pushed to browser via WebSocket
2. **Given** browser receives questions, **When** WebSocket connection is active, **Then** questions appear in browser UI
3. **Given** user answers questions in browser, **When** user clicks Submit, **Then** answers are sent to MCP server via HTTP POST
4. **Given** MCP server receives answers, **When** answers are complete, **Then** they are returned to Claude Code's waiting tool call
5. **Given** questions include multiple choice options, **When** displayed in browser, **Then** user sees radio buttons or dropdown
6. **Given** user clicks Back button, **When** reviewing answers, **Then** user can edit previous responses

---

### User Story 4 - Report Management and Cleanup (Priority: P3)

A developer wants to clear old debug reports to save disk space and keep the system organized.

**Why this priority**: Useful for long-term usage but not critical for initial adoption. Can be deferred without impacting core functionality.

**Independent Test**: Can be fully tested by creating multiple reports, calling cleanup tool, and verifying old reports are deleted. Delivers value by preventing storage bloat.

**Acceptance Scenarios**:

1. **Given** multiple debug reports exist, **When** Claude Code calls `clear_old_reports`, **Then** reports older than retention period are deleted
2. **Given** retention period is configurable, **When** server starts, **Then** configuration is loaded from config file
3. **Given** reports are deleted, **When** cleanup completes, **Then** associated screenshots and files are also removed

---

### Edge Cases

- What happens when browser sends malformed debug data (invalid JSON, missing required fields)?
- How does system handle very large screenshots (>10MB)?
- What happens when WebSocket connection drops during Q&A flow?
- How does system handle concurrent debug reports from multiple browsers?
- What happens when storage disk is full?
- How does system handle browser sending questions to already-answered Q&A session?

## Requirements

### Functional Requirements

- **FR-001**: System MUST accept HTTP POST requests at `/api/debug` with debug report payload
- **FR-002**: System MUST store debug reports in filesystem with unique ID and timestamp
- **FR-003**: System MUST extract and save screenshot files from base64 data
- **FR-004**: System MUST expose MCP tool `submit_debug_report` for receiving debug data
- **FR-005**: System MUST expose MCP tool `list_debug_reports` returning all stored reports
- **FR-006**: System MUST expose MCP tool `get_debug_report` accepting report ID
- **FR-007**: System MUST expose MCP tool `ask_user_questions` for sending questions to browser
- **FR-008**: System MUST expose MCP tool `clear_old_reports` for cleanup
- **FR-009**: System MUST expose MCP resource `debug://reports/latest` for most recent report
- **FR-010**: System MUST expose MCP resource `debug://reports/{id}` for specific reports
- **FR-011**: System MUST expose MCP resource `debug://screenshots/{id}` for screenshot files
- **FR-012**: System MUST maintain WebSocket connections with browsers for Q&A push notifications
- **FR-013**: System MUST push questions to browser when `ask_user_questions` is called
- **FR-014**: System MUST accept answers from browser via HTTP POST at `/api/questions/answer`
- **FR-015**: System MUST return answers to Claude Code's waiting MCP tool call
- **FR-016**: System MUST support text, multiple choice, and boolean question types
- **FR-017**: System MUST validate incoming debug data (required fields, data types)
- **FR-018**: System MUST log all operations (debug report received, questions sent, answers received)
- **FR-019**: System MUST load configuration from file (port, storage path, retention period)
- **FR-020**: System MUST run on localhost (127.0.0.1) only for security

### Key Entities

- **Debug Report**: Represents a single debugging session with console logs, error stack trace, screenshot reference, comments, timestamp, unique ID
- **Question Session**: Represents an active Q&A session with question list, pending/answered status, WebSocket connection reference, timeout handling
- **Screenshot**: Image file associated with debug report, stored as PNG with unique filename
- **Answer Set**: Collection of user responses to questions with question ID mapping and timestamp

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can send debug data from browser to Claude Code in under 5 seconds
- **SC-002**: Claude Code can retrieve and analyze debug reports without any manual file sharing
- **SC-003**: Interactive Q&A flow completes from question asked to answer received in under 2 minutes
- **SC-004**: System handles at least 10 concurrent WebSocket connections without errors
- **SC-005**: Debug reports are stored in organized structure that's human-readable
- **SC-006**: System startup time is under 3 seconds
- **SC-007**: MCP tools respond to Claude Code requests in under 500ms
- **SC-008**: Screenshots up to 5MB are processed and stored successfully

## Assumptions

- Developers are running the MCP server locally on their development machine
- Only one Claude Code instance connects to the server at a time
- Browser widgets have network access to localhost
- Storage is available on local filesystem (not cloud)
- Server runs continuously during development sessions
- Modern browsers with WebSocket support are used

## Out of Scope

- Authentication/authorization (localhost only, trusted environment)
- Remote access or cloud deployment
- Database storage (file-based only)
- Multi-user support (single developer use case)
- Integration with other IDEs besides VS Code
- Video recording or network trace capture (screenshots only)
- Real-time collaboration features
