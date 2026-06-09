# Design Audit — SRC Design System Compliance

Perform a design audit of the project's SCSS files against the Source UI
design system. Produce one output file:

**`design-audit-todo.md`** — checkable task list grouped by category with
effort estimates.

The audit is **read-only** — no source files are modified.

---

## Phase 0 — Choose Audit Mode & Categories

Before starting, ask the user two questions. The second question **depends on
the answer to the first**.

### Question 1 — Token enforcement mode

> **What type of audit should I run?**
>
> 1. **Strict (SRC compliance)** — full check against Source UI design tokens.
>    Enforces SRC color palette, spacing tokens, typography tokens.
>    Every hardcoded value that has a matching `--src-*` token is flagged as Critical.
>    Use this when the project uses `@3dsource/source-ui-native` and must follow
>    the design system strictly.
> 2. **General (style sanity)** — checks code quality without enforcing SRC tokens.
>    Skips rules 3.2 (hardcoded colors), 3.7 (non-existent tokens),
>    3.13 (primitive tokens in UI context).
>    Still detects: hardcoded px that should be CSS custom properties,
>    missing `var()` fallbacks, BEM violations, `:host` styling, `@import`,
>    duplicated patterns, and style clutter.

### Question 2 — Categories to audit (depends on Q1)

The category list shown to the user **changes based on the audit mode**.

#### If Strict (SRC compliance):

Show SRC token-related categories. Allow free text input so the user can
type specific categories (e.g. "spacing, typography").

> **Which token categories should I check?**
>
> 1. **Spacing** — hardcoded px in padding/margin/gap (rule 3.1)
> 2. **Colors** — hardcoded hex/rgb/hsl colors, primitive tokens (rules 3.2, 3.13)
> 3. **Typography** — hardcoded font-size/line-height/letter-spacing (rule 3.3)
> 4. **Layout** — hardcoded radius, oversized files, deep nesting (rules 3.4, 3.17, 3.18)
> 5. **Tokens** — missing var() fallbacks, non-existent token names (rules 3.6, 3.7)
> 6. **All token categories** _(recommended)_ — run all of the above

If user selects "All token categories", set the category list to:
`["spacing", "colors", "typography", "layout", "tokens"]`

#### If General (style sanity):

Show code-quality and structural categories only. These do not require
Source UI tokens. Allow free text input.

> **Which categories should I check?**
>
> 1. **Quality** — BEM violations, SCSS variables, :host, @import, abbreviated classes (rules 3.8-3.14)
> 2. **Cross-file** — duplicated patterns, magic numbers, global class redefinitions, repeated overrides
> 3. **Layout** — oversized files, deep nesting (rules 3.17, 3.18)
> 4. **All style sanity categories** _(recommended)_ — run all of the above

If user selects "All style sanity categories", set the category list to:
`["quality", "cross-file", "layout"]`

Store the selected mode and categories.

---

## Phase 1 — Read Skills

Read these files for context on what constitutes a violation:

```
.claude/skills/scss-design-system/SKILL.md
.claude/skills/layout-patterns/SKILL.md
```

---

## Phase 2 — Initialize TODO File

Create the output file with a header. It will be appended to during
the category loop.

### `design-audit-todo.md` — initial header

```markdown
# Design Audit — TODO

> Generated from audit on {date}
> Audit mode: {Strict | General}
> Categories: {comma-separated list}

---
```

---

## Phase 3 — Category Loop

**This is the core of the audit.** Process each selected category sequentially.
After writing each category's section, **discard its JSON data** and move to
the next category (write-then-forget pattern).

For each category in the selected list:

### 3.1 Run the scanner

```bash
python3 .claude/scripts/design-audit-scanner.py \
  --mode {strict|general} \
  --category {category} \
  --output report \
  2>/dev/null
```

The scanner outputs a JSON object with **pre-formatted markdown** sections:
- `todo` — ready-to-paste markdown for `design-audit-todo.md`
- `summary` — one-line progress summary for chat output
- `stats` — severity counts (`critical`, `warning`, `info`)
- `findings_total` — total raw finding count
- `files_scanned` — number of SCSS files scanned
- `total_lines` — total SCSS lines scanned

### 3.2 Parse and append

Parse the JSON output. The `todo` field contains pre-formatted markdown
that can be appended directly:

1. Append `todo` to `design-audit-todo.md`
2. Print `summary` to chat as the progress line

**No additional formatting or table generation is needed.** The scanner's
report formatter handles property-contextual token suggestions, effort tags,
file grouping, and +N notation automatically.

**CRITICAL: Never invent token names.** The scanner's report formatter only
uses tokens from `design-tokens.json`. If no token matches, it says
"no matching token" — it never guesses.

### 3.3 Discard category data

After writing the section, **discard the parsed JSON** for this category.
Do not accumulate data across categories.

### 3.4 Progress update

Print the `summary` field from the scanner output to chat.

#### Reference: TODO format by category

The scanner's `todo` field produces sections in these formats. These are for
reference only — you do not need to build them manually.

**Spacing / Colors / Typography / Layout:**

```markdown
## Token Replacements — {Category}

- [ ] [S] **Replace `16px` spacing with `var(--src-space-4, 16px)`** — 10 occurrences across 7 files
- [ ] [S] **Replace `8px` spacing with `var(--src-space-2, 8px)`** — 8 occurrences across 4 files
- [ ] [M] **Audit hardcoded `50px` spacing (no matching token)** — 7 occurrences across 3 files. Define project custom property or find closest token.
```

**Tokens:**

```markdown
## Token Fixes

- [ ] [M] **Rename `--src-shadow-large` → `--src-shadow-hard`** — 6 occurrences across 4 files
- [ ] [S] **Add fallbacks to `var(--src-border-container-basic)`** — 21 occurrences. Add `, #e0e0e0` fallback.
```

**Quality:**

```markdown
## Code Quality Fixes

- [ ] [S] **Fix BEM violations (&__ concatenation)** — 12 occurrences across 8 files. Write full `.block__element` selectors.
- [ ] [S] **Replace @import with @use** — 4 files
```

**Cross-file:**

```markdown
## Cross-File Consolidation

- [ ] [L] **Extract duplicated `display+flex-direction+align-items` pattern** — 8 occurrences across 5 files. Create shared class in `src/styles/`.
- [ ] [M] **Move `.src-radio label` override to global partial** — duplicated in 2 component files.
- [ ] [M] **Define custom property for magic number `13px`** — used in 5 files as font-size.
```

#### Effort tags

| Tag   | Meaning                                               |
| ----- | ----------------------------------------------------- |
| `[S]` | Single find-replace or 1-file change, <15 min         |
| `[M]` | 2-5 files affected or new partial creation, 15-60 min |
| `[L]` | 6+ files affected or architectural change, >60 min    |



---

## Phase 4 — Finalize

After all categories are processed:

### 4.1 Present results

Print a **summary** to chat (5-8 lines max):
- Total findings count and severity breakdown
- Number of TODO items with effort breakdown (S/M/L)
- Top 3 most impactful findings
- Confirm `design-audit-todo.md` was saved

Remind user to add the file to `.gitignore`.

**Do NOT offer auto-fix.** The audit is strictly read-only analysis.

---

## Detection Rules Reference

The scanner implements these rules. You need to understand them for
classification:

| Rule | Name                  | Severity | Category   | What it detects                                          |
| ---- | --------------------- | -------- | ---------- | -------------------------------------------------------- |
| 3.1  | Hardcoded spacing     | Critical | spacing    | Raw px in padding/margin/gap/inset                       |
| 3.2  | Hardcoded colors      | Critical | colors     | Raw hex/rgb/rgba/hsl (strict mode only)                  |
| 3.3  | Hardcoded typography  | Critical | typography | Raw px in font-size/line-height/letter-spacing           |
| 3.4  | Hardcoded radius      | Critical | layout     | Raw px in border-radius                                  |
| 3.6  | Missing fallback      | Warning  | tokens     | `var(--token)` without fallback value                    |
| 3.7  | Non-existent token    | Critical | tokens     | `var(--src-*)` not in design-tokens.json (strict only)   |
| 3.8  | BEM violation         | Warning  | quality    | `&__` concatenation in SCSS nesting                      |
| 3.9  | SCSS variable         | Critical | quality    | `$variable` in property values                           |
| 3.10 | Abbreviated class     | Info     | quality    | Short/abbreviated class names                            |
| 3.11 | :host styling         | Warning  | quality    | `:host` selector in component SCSS                       |
| 3.12 | host property         | Info     | quality    | `host:` in @Component decorator                          |
| 3.13 | Primitive color token | Warning  | colors     | `--src-color-red-*` etc. in UI properties (strict only)  |
| 3.14 | @import usage         | Warning  | quality    | `@import` statements (deprecated)                        |
| 3.16 | Magic numbers         | Info     | cross-file | Same px value in 3+ files with no SRC token              |
| 3.17 | Oversized file        | Info     | layout     | SCSS file >150 lines                                     |
| 3.18 | Deep nesting          | Info     | layout     | Selector nesting >3 levels                               |

Cross-file rules (in `cross_file` section):
- **Global class redefinitions** — component files overriding global classes
- **Repeated library overrides** — identical overrides in 2+ files
- **Duplicated property patterns** — 3+ identical properties across 2+ files

---

## Important Notes

- Do NOT modify any source files during the audit. This is **read-only** analysis.
- **Always use the scanner script** at `.claude/scripts/design-audit-scanner.py`.
  Never regenerate scanning logic from scratch.
- **Always use `--category` flag** — never run the scanner without it. Process
  one category at a time to keep JSON output manageable.
- **CRITICAL: Never invent or guess token names.** The scanner's report
  formatter only uses tokens from `design-tokens.json`. If no token matches,
  it says "no matching token". Never fabricate names.
- **Always use `--output report`** — the scanner produces pre-formatted
  markdown in the `todo` JSON field. Append it directly to the output file.
  No manual table generation or token lookup is needed.
- When both `-var-` and `-const-` layout tokens resolve to the same px value,
  the scanner prefers `-const-` (safer default; `var` tokens change by breakpoint).
- The output file should be added to `.gitignore` -- remind the user.
- **Write-then-forget:** After writing each category's section to the
  TODO file, discard the JSON data. Do not accumulate data across categories.
