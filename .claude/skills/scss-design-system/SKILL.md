---
name: scss-design-system
description: SCSS & Design System Convention — Source UI libraries, SRC design tokens, BEM methodology, theming
---

# SCSS & Design System Convention (SRC)

> Version 1.0.2

Complete styling guide for projects using the 3D Source design system.
Covers SCSS conventions, BEM methodology, Source UI component libraries,
SRC design tokens, and theming.

**Prerequisite:** If `@3dsource/source-ui-native` is not installed in the project,
suggest installing it (`pnpm add @3dsource/source-ui-native`). The package
provides all design tokens, compiled CSS, and SCSS sources. If the package
cannot be installed (no pnpm, no bundler), token data and documentation are
available via public fallback URLs listed in sections 3 and 4.

**Companion skill:** `layout-patterns` covers Angular component styling conventions,
responsive layout, file structure, scroll patterns, and visual accessibility.

**Library documentation:** `node_modules/@3dsource/source-ui-native/llms.txt`
(fallback if file missing: <https://preview.3dsource.com/front-libraries/develop/llms.txt>)

---

## 1. Hard rules

- **No Tailwind CSS** or any utility-first CSS framework.
- **No Material Icons font** — use SVG icons with `fill="currentColor"`.
- **BEM methodology** for all class naming.
- **SCSS only** — never author plain CSS files.
- **CSS custom properties must always have fallback values**, e.g. `var(--src-space-4, 16px)`.
- **Full readable class names** — no abbreviations (`.environment-card`, not `.env-card`).
- **`section_3dsourcecom`** class required on the app root container (`<app-root>` inner wrapper, root `<section>`, or `<body>`) for Source UI styles to apply. Do NOT place it on `<html>`.

---

## 2. BEM in SCSS

### Naming

| Part | Pattern | Example |
|---|---|---|
| Block | `.block-name` | `.product-card` |
| Element | `.block-name__element` | `.product-card__title` |
| Block modifier | `.block-name--modifier` | `.product-card--highlighted` |
| Element modifier | `.block-name__element--modifier` | `.product-card__title--truncated` |

### Concatenation rules

Only concatenate **modifiers** with `&`:

```scss
// Correct
.product-card {
  // ...

  &--highlighted {
    border-color: var(--src-ui-accent-default, #017BFF);
  }
}

// Element — write out fully, never concatenate
.product-card__title {
  font-size: var(--src-font-size-md, 16px);
}

// WRONG — never do this
.product-card {
  &__title { ... } // forbidden
}
```

### File naming

Component SCSS is co-located with its component TypeScript file and shares the same base name (e.g. `product-card.component.scss` beside `product-card.component.ts`).

---

## 3. Source UI libraries

Two packages:

| Package | Purpose | Dependencies |
|---|---|---|
| `@3dsource/source-ui-native` | Zero-dependency primitives, CSS-only elements, 1020 design tokens. Works without Angular -- can be used in any project via compiled CSS. | `tslib` only |
| `@3dsource/source-ui` | Higher-level Angular components (CDK/Material based) | `source-ui-native >=2`, `@angular/core >=19`, `@angular/material >=19`, `ngx-scrollbar >=19`, `swiper >=11.2.6` |

### Library selection priority

| Scenario | Install |
|---|---|
| Non-Angular (plain HTML, React, Vue, Webflow, etc.) | `source-ui-native` only, import compiled CSS |
| Angular without CDK/Material needs | `source-ui-native` only |
| Angular with CDK/Material (form fields, popover, tabs, color-picker, tooltip, CDK modal) | Both `source-ui-native` + `source-ui` |

Only install `@3dsource/source-ui` when you explicitly need its components.

### Import paths

**SCSS (Angular projects with a builder):**

```scss
// source-ui-native only
@use '../node_modules/@3dsource/source-ui-native/styles/source.ui.native.scss' as source-ui-native;

// source-ui-native + source-ui
@use '../node_modules/@3dsource/source-ui-native/styles/source.ui.native.scss' as source-ui-native;
@use '../node_modules/@3dsource/source-ui/styles/source.ui.scss' as source-ui;
```

**Compiled CSS (non-Angular / CSS-only / no builder):**

```
node_modules/@3dsource/source-ui-native/styles/source-ui-native.min.css
```

> SCSS files use **dots** in filenames (`source.ui.native.scss`).
> Compiled CSS uses **dashes** (`source-ui-native.min.css`).
> Do not confuse them. Do not fabricate paths.

### Angular requirement for `source-ui`

When using `@3dsource/source-ui`, provide `MAT_FORM_FIELD_DEFAULT_OPTIONS` globally:

```typescript
providers: [
  { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
]
```

### Available components

**source-ui-native Angular components:** badge, banner, button, copyright, divider, hint, icon-button, loading, logo-loading, modal-element, slider.

**source-ui Angular components:** color-picker, popover, slider-group, tabs, tab, tab-line, tooltip directive, toastr styling, Material form field styling.

**Source Elements (CSS-only, from source-ui-native):** button (`src-button`), icon-button (`src-icon-button`), input (`src-input`), select (`src-select`), textarea (`src-textarea`), label (`src-label`), list (`src-list`), checkbox (`src-checkbox`), radio (`src-radio-group`), toggle (`src-toggle`), form layout (`src-form`), modal (`src-modal`), popover, badge (`src-badge`), banner (`src-banner`), divider (`src-divider`), hint (`src-hint`).

### Form layout

```html
<form class="src-form">
  <div class="src-form__row">
    <!-- single column (default) -->
  </div>
  <div class="src-form__row src-form__row--double">
    <!-- 2-column grid -->
  </div>
  <div class="src-form__row src-form__row--triple">
    <!-- 3-column grid -->
  </div>
  <div class="src-form__button-row">
    <!-- action buttons -->
  </div>
</form>
```

### Prefer existing components

Before building custom UI, search for an existing Source UI component or Source Element with the same semantic meaning. Only create new components as a last resort.

---

## 4. SRC design tokens

All 1020 tokens use the `--src-` prefix. Never hardcode spacing, font sizes, radii, heights, or icon sizes — always use tokens.

### Token groups cheat sheet

| Category | Token pattern | Example |
|---|---|---|
| Spacing | `--src-space-*` | `--src-space-4` (16px) |
| UI padding | `--src-padding-*` | `--src-padding-md` |
| UI height | `--src-height-*` | `--src-height-md` |
| UI gap | `--src-gap-*` | `--src-gap-md` |
| Icon size | `--src-icon-size` | 16px default |
| Border radius (component) | `--src-border-rounded-*` | `--src-border-rounded` |
| Border radius (layout) | `--src-layout-radius-*` | `--src-layout-radius-1` |
| Layout padding | `--src-layout-padding-(const\|var)-*` | `--src-layout-padding-var-md` |
| Layout gap | `--src-layout-gap-(const\|var)-*` | `--src-layout-gap-const-sm` |
| Layout height | `--src-layout-height-(const\|var)-*` | `--src-layout-height-var-lg` |
| Typography primitives | `--src-font-*` | `--src-font-size-md` |
| Typography responsive | `--src-typography-var-*` | `--src-typography-var-heading` |
| Surface colors | `--src-surface-*` | `--src-surface-primary` |
| Text colors | `--src-text-*` | `--src-text-primary` |
| Icon colors | `--src-icon-*` | `--src-icon-default` |
| Border colors | `--src-border-*` | `--src-border-default` |
| Accent / status | `--src-ui-*` | `--src-ui-accent-default` |
| Shadows | `--src-shadow-*` | `--src-shadow-md` |
| Gradients | `--src-gradient-*` | `--src-gradient-primary` |

### Responsive (`var`) vs constant (`const`) tokens

- `var` tokens **change by breakpoint** (sm / md / lg / xl) — use for adaptive / responsive UI.
- `const` tokens **stay the same** across all screen sizes — use for fixed-size UI.

Do not mix `const` and `var` layout tokens in the same adaptive context.

### Alpha tokens

Alpha tokens (`--src-color-alpha-*`) may only be used as **overlays on top of a solid surface layer**. Never use alpha as the only background without a solid surface under it.

### Radius hierarchy

Smaller level number = bigger radius. Parent containers must have a larger (or equal) radius than nested children.

Use only `--src-border-rounded-*` (component-level) and `--src-layout-radius-*` (layout-level).

### Token resolution order

1. **Semantic token** from the design system (e.g. `--src-surface-container-main`)
2. **Primitive token** if no semantic match (e.g. `--src-space-4`)
3. **Raw value** (px/rem) as last resort — but never invent a token name that doesn't exist

Always include a fallback: `var(--src-space-4, 16px)`.

### Resources

- Design Tokens JSON: `node_modules/@3dsource/source-ui-native/docs/design-tokens.json` — all tokens grouped by category
  (fallback if file missing: <https://preview.3dsource.com/front-libraries/develop/docs/design-tokens.json>)
- Full design system rules: `node_modules/@3dsource/source-ui-native/docs/llms-design-rules.md`
  (fallback if file missing: <https://preview.3dsource.com/front-libraries/develop/llms-design-rules.md>)


---

## 5. Theming & visual customization

### Hard rule: never remove or replace tokens with hardcoded values

When the user requests a visual change (e.g., "make it more modern", "change shadows",
"flatten the design", "change colors"):

1. **Identify which SRC tokens** control the visual property being changed (surfaces, shadows, radii, borders, typography, etc.).
2. **Create `_theme-overrides.scss`** (or extend it if it already exists) in the project's `src/` directory.
3. **Override tokens** inside `.section_3dsourcecom { ... }` scope:

```scss
// src/_theme-overrides.scss
.section_3dsourcecom {
  // Example: flatter, more modern look
  --src-shadow-hard: var(--src-color-alpha-default-10);
  --src-shadow-light: transparent;
  --src-shadow-blur: 0px;
  --src-surface-container-secondary: var(--src-color-grey-100);
  --src-border-rounded: var(--src-space-2);
}
```

4. **Import the override file** in `styles.scss` after library styles but before any project globals:

```scss
@use '../node_modules/@3dsource/source-ui-native/styles/source.ui.native.scss' as source-ui-native;
@import 'theme-overrides'; // <-- here
// ... project globals
```

5. **Component SCSS stays untouched** — it keeps using `var(--src-token, fallback)`. The overrides flow through automatically via CSS custom property inheritance.

### What you must NEVER do when changing visual style

- Replace `var(--src-token, fallback)` with a hardcoded value in component SCSS.
- Remove SRC token usage from existing components.
- Inline new color/spacing/shadow values directly in component files.

### Accent color override

The accent palette (buttons, links, focus rings) defaults to `#017BFF`.
To customize, create `_accent-override.scss` with 11 shades and 6 alpha variants, imported after the library stylesheet.
See the full override template in `node_modules/@3dsource/source-ui-native/llms.txt` (see "Theming: Custom Accent Colors" section).
(fallback if file missing: <https://preview.3dsource.com/front-libraries/develop/llms.txt>)

### Project-level SCSS partials — `src/styles/` convention

All project-level SCSS partials (custom properties, token overrides, theme overrides, scrollbar config, etc.) **must** live in `src/styles/`.

- Create the folder if it doesn't exist.
- Partial files use underscore prefix: `_app-surfaces.scss`, `_theme-overrides.scss`, etc.
- Import them in `src/styles.scss` **exclusively via `@use`** — never `@import`:

```scss
// src/styles.scss
@use '../node_modules/@3dsource/source-ui-native/styles/source.ui.native.scss' as source-ui-native;
@use '../node_modules/@3dsource/source-ui/styles/source.ui.scss' as source-ui;

@use 'styles/app-surfaces';       // project custom properties
@use 'styles/theme-overrides';    // token overrides (if any)

// ... global resets, body styles, etc.
```

> **`@import` is deprecated** in Dart Sass and will be removed in Sass 3.0.
> The build will emit a deprecation warning for any `@import` usage.
> Always use `@use` (with or without a namespace alias).

---

## 6. Scrollbar styling

When a container has content overflow (e.g. a sidebar, a scrollable panel, a long list), use the **native browser scrollbar** with minimalist design-system-aware styles instead of custom JS-based scrollbar libraries.

Add the following to `styles.scss` (or a `src/styles/_scrollbar.scss` partial imported via `@use`) **after** library imports:

```scss
.section_3dsourcecom {
  --srcScrollbarThumbColor: var(--src-border-container-basic, #d1d5db);
  --srcScrollbarTrackColor: transparent;

  *,
  *::before,
  *::after {
    scrollbar-color: var(--srcScrollbarThumbColor) var(--srcScrollbarTrackColor);
    scrollbar-width: thin;
  }
}
```

- `scrollbar-width: thin` renders a narrow native scrollbar (Firefox and Chromium 121+).
- `scrollbar-color` sets thumb and track via CSS custom properties — theming overrides work automatically.
- Scoped to `.section_3dsourcecom` to stay consistent with the design system.
- To customize per theme, override `--srcScrollbarThumbColor` / `--srcScrollbarTrackColor` in `_theme-overrides.scss`.

---

## 7. Angular component styling

> For component styling and layout anti-patterns (`:host`, inline styles, `rem`/`em`, etc.),
> see the `layout-patterns` skill.

| Anti-pattern | Correct approach |
|---|---|
| Hardcoded `px` values for spacing/sizing | Use `--src-space-*`, `--src-padding-*`, etc. |
| Primitive color tokens for UI (`--src-color-red-500`) | Use semantic tokens (`--src-ui-accent-error`) |
| Alpha token as standalone background | Always layer alpha on top of a solid surface |
| Mixing `const` and `var` tokens in adaptive layout | Pick one strategy per context |
| Child radius > parent radius | Maintain radius hierarchy |
| Abbreviated class names (`.env-card`) | Full readable names (`.environment-card`) |
| `&__element` concatenation in SCSS | Write `.block__element` fully |
| Material Icons font | SVG icons with `fill="currentColor"` |
| Fabricated import paths | Use only documented paths from section 3 |
| Missing fallback on `var()` | Always provide fallback: `var(--token, value)` |
| Inventing non-existent token names | Search for semantic equivalent or use raw value |
| Tailwind / utility-first classes | BEM + SRC tokens |
