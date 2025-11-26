# New Feature

Create a new feature specification in the specs folder.

## Instructions

1. Ask the user for the feature name if not provided
2. Determine the next spec number by checking existing specs in `/specs/` folder
3. Create folder: `/specs/<NNN>-<feature-name>/` using kebab-case
4. Initialize spec-kit for the feature by creating `.spec-kit/` folder
5. Create initial `spec.md` with:
   - Title
   - Overview/Description
   - Requirements (to be filled)
   - Status: Draft
6. Confirm creation and provide the path

## Spec-kit Setup

Create `.spec-kit/` folder inside the feature with:
- `config.json` - basic configuration
- Any templates needed

## Numbering

- Scan `/specs/` for highest existing number prefix (e.g., 028)
- Use next number (e.g., 029)
- Format: three digits with leading zeros

## Example Structure

```
/specs/
  029-new-feature-name/
    .spec-kit/
      config.json
    spec.md
```

## Output

Confirm: "Created feature spec at `/specs/<NNN>-<feature-name>/` with spec-kit initialized."
