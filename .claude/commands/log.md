# Log Session

Save the entire conversation to a log file.

## Instructions

1. Create the `/logs/` directory if it doesn't exist
2. Generate a 1-5 word summary of the session in snake_case (e.g., `fix_auth_bug`, `add_user_dashboard`, `refactor_api_routes`)
3. Save the complete conversation to `/logs/session_YYYY-MM-DD-<summary>.md`
4. Use today's date in the filename
5. Format the log as markdown with clear separation between user and assistant messages
6. Include timestamps if available
7. Confirm the file was saved and provide the path

## Log Format

```markdown
# Session Log: <Summary Title>
Date: YYYY-MM-DD

---

## User
<user message>

## Assistant
<assistant response>

---
(repeat for all messages)
```
