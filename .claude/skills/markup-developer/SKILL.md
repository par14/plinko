---
name: markup-developer
description: HTML template and SCSS markup guide for Angular projects — BEM class naming, template patterns, SCSS structure, layout techniques, Source UI component usage, design token integration, and visual patterns. Use when writing or reviewing HTML/SCSS.
---

# Markup Developer Guide

> Version 1.0.0

Self-contained reference for writing HTML templates and SCSS in Angular projects
using BEM methodology and the SRC design system.

---

## 1. Hard rules

### HTML

- Use `@if`, `@for`, `@switch` — never `*ngIf`, `*ngFor`, `*ngSwitch`.
- Never put classes on application components (`<app-sidebar class="...">` is forbidden). Classes on library components are fine.
- `@for` must always have `track` by a unique identifier.
- Use `@let` to cache signal reads and avoid repeated calls in the template.
- Separate `.html` file for every component.

### SCSS

- BEM methodology for all class naming.
- Only concatenate **modifiers** with `&` (`&--modifier`). Never concatenate elements — write `.block__element` fully.
- CSS custom properties must always have fallback values: `var(--src-space-4, 16px)`.
- Full readable class names — no abbreviations (`.environment-card`, not `.env-card`).
- No `all: unset`. No Tailwind. No `rem`/`em` — all sizes in `px` (`fr` only for grid tracks).
- Separate `.scss` file for every component. Never style `:host`. Use `@use`, never `@import`.

---

## 2. BEM naming

| Part | Pattern | Example |
|---|---|---|
| Block | `.block-name` | `.product-card` |
| Element | `.block-name__element` | `.product-card__title` |
| Block modifier | `.block-name--modifier` | `.product-card--highlighted` |
| Element modifier | `.block-name__element--modifier` | `.product-card__title--truncated` |

The root element's class matches the component name: `ProductCardComponent` -> `.product-card`.

SCSS concatenation — the one rule that needs an example because it's the most common mistake:

```scss
.card {
  &:hover { }        // pseudo-class — OK
  &--selected { }    // modifier — OK
}

// Elements — ALWAYS fully written, NEVER &__element
.card__head { }
.card__title { }
.card__action {
  &--visible { }     // element modifier — OK
}
```

---

## 3. HTML template conventions

### Control flow

- `@if (condition) { } @else { }` for conditionals.
- `@for (item of items; track item.id) { } @empty { }` for loops.
- `@let varName = signal()` to cache values.
- `@defer (when (condition)) { }` for lazy-loading heavy children.

### Bindings

- **Multiple conditional classes:** `[ngClass]="{ 'card--selected': isSelected(), 'card--active': isActive() }"`.
- **Single conditional class:** `[class.active]="isActive()"`.
- **Test IDs** on interactive elements: `[attr.data-testid]="'button-name'"` or `[attr.data-testid]="'card-' + item.id"`.
- **Tab panels:** use `[hidden]` (preserves state), not `@if`.
- **Image fallback:** `<img #img (error)="img.src = FALLBACK" [ngSrc]="path()" fill alt="desc" />`.

### Content projection

- Named slots: `<ng-content select="app-component-name">` or `<ng-content select="[attribute]">`.
- Default slot: `<ng-content />`.
- Reusable blocks: `<ng-template #name>...</ng-template>`.

### Interpolation

- Signal reads: `{{ title() }}`.
- Null-safe: `{{ product?.title ?? 'N/A' }}`.
- Pipes: `{{ value | pipeName: arg }}`.

---

## 4. Composition principles

These are general guidelines for assembling blocks — not specific page templates.

- **One BEM block per component.** The component's root element carries the block class. All child classes are elements of that block.
- **Semantic HTML for structure.** Use `<header>`, `<section>`, `<footer>`, `<nav>`, `<dl>` where appropriate — not `<div>` for everything.
- **Grid for page zones, flex for inline alignment.** Parent components define the grid; children fill their cells without knowing the layout.
- **Heading / body / footer pattern** for any container with potentially overflowing content (panels, modals, pages, sidebars, boxes). Heading and footer are fixed; body scrolls and absorbs available height. Grid: `grid-template-rows: auto minmax(0, 1fr) auto`. Body gets `overflow: auto; scrollbar-gutter: stable`. Footer can be omitted. This is the universal layout primitive — use it everywhere content can overflow vertically.
- **Empty and loading states** are first-class. Every list/data view should handle both — empty state when no items and not loading, loading overlay when fetching.
- **Tab panels** use `[hidden]` (preserves component state), not `@if` (destroys and recreates).
- **Content projection** over configuration. Pass child components via `<ng-content select="...">` slots rather than building all variations into one component.
- **`@defer`** for heavy children that depend on async data — don't render them until the data exists.
- **Modifiers for visual states** (`--selected`, `--disabled`, `--collapsed`), not separate CSS classes or inline styles.
- **Hover-revealed actions** (menus, buttons) are hidden via `opacity: 0` and shown on parent `:hover` or `.active` — not toggled via `@if`.

---

## 5. Source UI components

**Never build custom markup for something Source UI already provides.** Before writing a button, input, modal, list, form, checkbox, toggle, select, radio, badge, banner, divider, hint, or label from scratch — use the corresponding Source UI component or CSS class. If unsure whether a component exists, check `node_modules/@3dsource/source-ui-native/llms.txt` for the full catalog.

### Angular components (from `@3dsource/source-ui-native` and `@3dsource/source-ui`)

| Component | When to use |
|---|---|
| `<src-button>` | All action buttons. `weight="primary"` for primary actions. |
| `<src-icon-button>` | Icon-only buttons. Wraps `<app-src-icon>` as child. |
| `<src-loading>` | Loading spinner. |
| `<src-divider>` | Horizontal separator line. |
| `<src-hint>` | Form field hint or error message. `[isError]="true"` for errors. |
| `<src-tab-line>` | Horizontal tab navigation bar. |
| `<src-badge>` | Status/count badge. |
| `<src-banner>` | Info/warning/error banner. |
| `<app-src-icon>` | SVG icon. `name="icon_name"`. |

### CSS-only Source Elements (applied via classes, no Angular component needed)

| Element | Classes | When to use |
|---|---|---|
| Button | `.src-button` | When `<src-button>` component is not available (non-Angular contexts). |
| Icon button | `.src-icon-button` | Same as above. |
| Input | `.src-input` | Text input styling. |
| Select | `.src-select` | Dropdown select styling. |
| Textarea | `.src-textarea` | Multi-line text input styling. |
| Checkbox | `.src-checkbox`, `.src-checkbox--size-lg` | Checkbox styling (often combined with `<mat-checkbox>`). |
| Radio | `.src-radio-group` | Radio button group styling. |
| Toggle | `.src-toggle` | On/off toggle switch styling. |
| Label | `.src-label`, `.src-label-md` | Form field labels. |
| List | `.src-list`, `.src-list__item` | Menu/option lists. |
| Modal | `.src-modal`, `.src-modal__header`, `.src-modal__body`, `.src-modal__footer` | Dialog/modal structure. |
| Form | `.src-form`, `.src-form__item`, `.src-form__row`, `.src-form__row--double`, `.src-form__row--triple`, `.src-form__button-row` | Form layout. |
| Badge | `.src-badge` | When `<src-badge>` component is not available. |
| Banner | `.src-banner` | When `<src-banner>` component is not available. |
| Divider | `.src-divider` | When `<src-divider>` component is not available. |
| Hint | `.src-hint` | When `<src-hint>` component is not available. |
| Popover | `.src-popover` | Popover/dropdown container. |
| Typography | `.src-title-xs`, `.src-title-sm`, `.src-title-md`, `.src-body-xs`, `.src-body-sm` | Text sizing classes. |

### Angular Material (used alongside Source UI)

| Component | When to use |
|---|---|
| `<mat-form-field>` | Form field wrapper. Use `matPrefix`/`matSuffix` for icons. |
| `<mat-checkbox>` | Checkbox input (combine with `.src-checkbox--size-lg` class). |
| `<mat-expansion-panel>` | Accordion/collapsible sections. |
| `matInput` | Input directive inside `<mat-form-field>`. |

### Custom directives

| Directive | Purpose |
|---|---|
| `appScrollNearEnd` | Infinite scroll — emits `(nearEnd)` when scroll reaches bottom. |
| `cdkOverlayOrigin` | CDK overlay positioning anchor. |
| `[srcTooltip]` | Tooltip. Configure with `srcTooltipPosition`, `srcTooltipMaxWidth`. |
| `[ngSrc]` | Optimized image loading. Use with `fill` for fluid images. |

---

## 6. SCSS patterns

### Component-level custom properties

Define scoped CSS variables at the block level mapping to design tokens. States/modifiers override the variables, not the properties:

```scss
.card {
  --cardBackground: var(--src-surface-container-main, #fff);
  --cardBorderColor: var(--src-border-container-light, rgba(148, 163, 184, 0.16));
  background: var(--cardBackground);
  border: 1px solid var(--cardBorderColor);

  &:hover { --cardBorderColor: var(--src-border-container-basic, #d1d5dbff); }
  &--selected { --cardBackground: var(--src-surface-container-on-top, #94a3b814); }
}
```

This is the one SCSS pattern worth showing because the variable-override technique is the foundation for how all components handle states.

### Layout rules

- **Grid** for page structure and 2D layouts. Always `minmax(0, 1fr)`, never bare `1fr`.
- **Flexbox** for single-axis alignment.
- Page layout: `grid-template-rows: var(--headerH) minmax(0, 1fr)`.
- Three-column with sidebars: `grid-template-columns: auto minmax(0, 1fr) auto`.
- Panel (header/body/footer): `grid-template-rows: auto minmax(0, 1fr) auto`.
- Card grid: `repeat(auto-fill, minmax(162px, 188px))`.
- Collapsed sidebar variant: change the `auto` column to a fixed width (e.g. `62px`).

### Transitions

`0.35s ease-in-out` for UI elements. List individual properties — never `transition: all`.

### Hover-triggered visibility

Hidden elements (opacity: 0, z-index: -1) revealed on parent `:hover` or `.active` state (opacity: 1, z-index: 1). Used for card actions and sidebar item menus.

### Text overflow

- Single-line: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap`.
- Multi-line: `-webkit-line-clamp: N; -webkit-box-orient: vertical; display: -webkit-box; overflow: hidden`.

### Images

- Container: `aspect-ratio: 1/1` (or appropriate ratio).
- Contained (full image): `object-fit: contain`.
- Cover (fill, may crop): `object-fit: cover; object-position: center`.

### Disabled / inactive

- Disabled: `opacity: 0.5; pointer-events: none`.
- Archived: `filter: grayscale(1)` on the image container.

### Scrollable containers

`overflow: auto; scrollbar-gutter: stable`.

### Absolute positioning

- Top-right action: `position: absolute; top: -4px; right: -4px`.
- Centered floating: `position: absolute; left: 50%; transform: translateX(-50%)`.

### Source UI overrides

Prefer CSS custom property overrides. Use `::ng-deep` only as last resort. Material overrides use `@include mat.component-overrides((...))`.

### Button reset

For custom interactive elements (not action buttons): `appearance: none; background: none; border: none; padding: 0; margin: 0; font: inherit; color: inherit; cursor: pointer`. For action buttons, always use `<src-button>`.

### Responsive breakpoints

Mobile-first with modern range syntax: `@media (width >= 768px)`, `1024px`, `1280px`, `1600px`, `1900px`.

---

## 7. Global styles structure

```
src/styles/
  _main.scss                      # Entry (imports all via @use)
  variables.scss                  # Project custom properties (--headerH, --left-side, etc.)
  input.scss                      # Input overrides
  source-ui-native-override.scss  # Library overrides
  elements/                       # Reusable element styles (accordion, src-panel, sidebar-list-item, etc.)
  container/                      # Page containers (page-content, cards-list, layout-column, etc.)
```

Promote to `elements/` or `container/` when a pattern is reused across multiple components. Component-specific styles stay in the component `.scss`.

---

## 8. Anti-patterns

| Don't | Do |
|---|---|
| `*ngIf`, `*ngFor` | `@if`, `@for` |
| Classes on `<app-*>` | Style from inside; parent uses grid |
| `@for` without `track` | `track item.id` |
| `@if` for tab panels | `[hidden]` preserves state |
| `&__element` nesting | `.block__element` written fully |
| Abbreviated class names | Full words (`.environment-card`) |
| `var()` without fallback | `var(--token, fallback)` |
| `all: unset` | Explicit property resets |
| `rem` / `em` | `px` (or `fr` for grid) |
| Bare `1fr` | `minmax(0, 1fr)` |
| `transition: all` | List individual properties |
| `:host` styling | Wrapper element class |
| `@import` | `@use` |
| Hardcoded colors/spacing | Design tokens with fallbacks |
| Custom button markup | `<src-button>` / `<src-icon-button>` |
| Custom modal structure | `.src-modal` + header/body/footer |
| Custom form layout | `.src-form` + `.src-form__item` + `.src-label` |
| Tailwind | BEM + design tokens |
