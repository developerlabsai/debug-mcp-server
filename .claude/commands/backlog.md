# Add to Backlog

Add a new item to the project backlog.

## Instructions

1. Ask the user for the backlog item name if not provided
2. Create a new folder in `/backlog/<item-name>/` using kebab-case
3. Initialize spec-kit for the backlog item by creating `.spec-kit/` folder with basic structure
4. Create an initial `README.md` or `spec.md` with:
   - Title
   - Description (ask user or generate from context)
   - Priority (if specified)
   - Status: Backlog
5. Confirm creation and provide the path

## Spec-kit Setup

Create `.spec-kit/` folder inside the backlog item with:
- `config.json` - basic configuration
- Any templates needed

## Example Structure

```
/backlog/
  plugin-marketplace/
    .spec-kit/
      config.json
    spec.md
```

## Output

Confirm: "Created backlog item at `/backlog/<item-name>/` with spec-kit initialized."
