# 🥦 rx-diet | TL;DR

## 🛑 The Problem

Reactive Resume JSON exports are absolute token incinerators — bloated with thousands of lines of UI metadata, UUIDs, and layout arrays. Feeding a raw JSON export to an LLM agent forces a machine to parse an existential crisis of hex codes just to fix a single typo in your experience section.

## 🥗 The Solution

A minimal-dependency CLI that puts your resume on a strict, carb-free fast before handing it to the AI, and bulks it back up when the AI is done:

1. **Dehydrate (The Fast):** Starve the JSON into a clean Markdown file (`.rxresume.md`) so your AI agent can read and edit your credentials like a civilized entity without charging you a mortgage payment in API fees.
2. **Rehydrate (The Bulk):** Safe-inject the AI's semantic updates back into the original schema. Every custom font, layout matrix, and toggle remains completely untouched.

## Installation

```bash
npx HenryGetz/rx-diet
```

Or install globally:

```bash
npm install -g HenryGetz/rx-diet
```

> **Note**: If the global install above fails on npm ≥ 11 (a known npm bug with git-based global installs), use the `npx` command or clone manually:
> ```bash
> git clone https://github.com/HenryGetz/rx-diet.git
> cd rx-diet && npm install && npm link
> ```

## Quick Start

```bash
# Dehydrate: JSON → Markdown
npx HenryGetz/rx-diet resume.json
# → resume.rxresume.md

# Edit the markdown (by hand or via LLM)

# Rehydrate: Markdown → JSON
npx HenryGetz/rx-diet resume.rxresume.md
# → resume_updated.json
```

## CLI Reference

```
rx-diet <input> [options]
```

The operation is auto-detected from the file extension: `.json` → dehydrate, `.rxresume.md` → rehydrate.

### Flags

| Flag | Purpose |
|------|---------|
| `-o, --output <path>` | Override default output path |
| `-b, --base <path>` | Override base JSON lookup (rehydrate only) |
| `--in-place` | Overwrite the base JSON on rehydrate |
| `--backup` | Pair with `--in-place`; writes `.json.bak` |
| `--diff` | Show semantic diff, write nothing, exit 0/1/2 |
| `--dry-run` | Run full pipeline, print result to stdout, write nothing |
| `--confirm` | Required when fuzzy-match identity resolution is used |
| `--prompt` | Print the recommended LLM system prompt to stdout |
| `--lint` | Validate `.rxresume.md` format without rehydrating |
| `--fix` | Auto-repair common formatting issues in `.rxresume.md` |
| `--json-errors` | Emit errors as structured JSON to stderr |
| `-h, --help` | Show help |
| `-V, --version` | Show version |

### Stdin / Stdout

Pass `-` as input to read from stdin; `-o -` to write to stdout:

```bash
cat resume.json | rx-diet - -o - | llm-tool | rx-diet - -b resume.json
```

### Multi-file

```bash
rx-diet *.json    # Processes each file independently
```

## 🔐 The Merge Contract

`rx-diet` uses a **three-tier identity resolution** system to map edits in the markdown back to the correct entries in the original JSON:

1. **Inline `<!-- id:UUID -->` comments** — primary identity markers placed after every entry heading. These survive most LLM edits.
2. **Frontmatter `id_map`** — a backup manifest mapping section paths to UUIDs. Survives even when LLMs strip comments.
3. **Content-hash fuzzy match** — last resort: matches entries by their identifying fields (company + role for experience, school + degree for education, etc.). Requires `--confirm`.

**What gets edited:** Content fields — text, descriptions, bullet points, dates, links, names.

**What stays untouched:** UUIDs, visibility toggles, layout configuration, typography settings, template choice, page margins, custom CSS, and every other non-content field in the JSON.

**Hard delete:** An entry present in the base JSON but absent from the markdown is **removed** from the output. Use `--diff` as a safety net to preview changes before writing.

**Refuse-to-write guarantee:** The rehydrated output is validated against the vendored Reactive Resume V5 schema. If it doesn't pass, `rx-diet` refuses to write the file.

### The `.rxresume.md` Format

Every `.rxresume.md` file starts with YAML frontmatter carrying version info and the identity manifest:

```yaml
---
rx_diet_version: 1
rxresume_schema: v5
source: resume.json
generated: 2026-05-18T12:00:00Z
id_map:
  sections.experience.0: c8d1e5a2
  sections.education.0: e0f3a7c4
---
```

Section entries use pipe-delimited headings with identity comments:

```markdown
### Software Engineer | Google | 2024-01—2026-05
<!-- id:c8d1e5a2 -->

- Built CaliperUI, a pixel-accurate UI comparison tool.
- Led migration from REST to GraphQL, reducing payload sizes by 60%.
```

Rich text (HTML descriptions) is converted to markdown. Exotic HTML that can't be cleanly converted is preserved in fenced ` ```html ` blocks.

### Token Efficiency

The dehydrated output is optimized for LLM context windows:

- Short date format (`2024-01`, not `January 2024`)
- Inline link syntax (`[text](url)`)
- No redundant blank lines or trailing whitespace
- ASCII bullets and dashes

A maximally-complex resume typically produces a `.rxresume.md` that's **under 20% the token count** of the raw JSON.

## LLM Integration

Print the recommended system prompt for your LLM:

```bash
rx-diet --prompt
```

This outputs a versioned, tested system prompt that teaches the LLM how to edit `.rxresume.md` files without corrupting them. Include it in your LLM's system prompt when editing resumes.

### Workflow

```bash
# 1. Dehydrate your resume
rx-diet resume.json

# 2. Get the LLM prompt
rx-diet --prompt

# 3. Feed the prompt + resume.rxresume.md to your LLM
# 4. Save the LLM's output back to resume.rxresume.md

# 5. Preview changes
rx-diet resume.rxresume.md --diff

# 6. Apply changes
rx-diet resume.rxresume.md --in-place --backup
```

## 📡 Telemetry

**None.** This tool sends nothing anywhere, ever. No analytics, no crash reporting, no usage tracking. It's a local file transformer and nothing more.

## License

MIT
