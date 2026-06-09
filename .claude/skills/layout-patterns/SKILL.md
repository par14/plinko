---
name: layout-patterns
description: Component organization, responsive layout patterns, file structure, and visual accessibility
---

# Layout Patterns & Component Organization

> Version 1.0.0

Rules for Angular component styling conventions, responsive layout,
file structure, scroll behavior, and visual accessibility.

**Companion skill:** `scss-design-system` covers design tokens (`--src-*`),
BEM methodology, Source UI libraries, theming, and scrollbar styling.
All token and BEM rules from that skill apply here implicitly — this skill
does not duplicate them.

---

## 1. Angular component styling

- Always use a separate `.scss` file (`styleUrl`) — never inline `styles` in `@Component`.
  Exception: the SVG icon component (`SvgIconComponent`) keeps template and styles inline in the TS file.
- Never use the `host` property in the `@Component` decorator.
- Never style `:host` in SCSS — the parent is responsible for sizing and positioning
  its children. Use a top-level wrapper element inside the template instead.
- Prefer naming the component's top-level class after the component itself
  (e.g. `ProductCardComponent` → `.product-card` as the root element class in the template).
- `:host-context` and `::ng-deep` are allowed when necessary for difficult styling situations.
  Avoid `::ng-deep` when possible — it is a last resort.
- Never put classes on application components
  (e.g. `<app-sidebar class="...">` is not allowed).
  Classes on library / third-party components are fine.
- For layout, use CSS Grid with automatic sizing, or handle sizing inside the component itself.
- When the same styling pattern appears across multiple components, extract it
  into a shared global class or SCSS partial. Component-specific styles stay
  in the component — only promote what is genuinely reused.

---

## 2. File structure

### Co-location

Component SCSS is co-located with its component TypeScript file and shares
the same base name:

```
product-card/
  product-card.component.ts
  product-card.component.html
  product-card.component.scss
```

### Shared styles

Shared styles go in global SCSS partials (variables, mixins, resets, base styles).
Place them in `src/` or a dedicated `src/styles/` directory.

### Import order in `styles.scss`

1. Library styles (see `scss-design-system` skill for exact import paths)
2. Accent / theme overrides (if any)
3. Project globals (variables, resets, base, scrollbar)
4. Component styles are loaded automatically by Angular per component — do not import them manually

---

## 3. Responsive layout

### Strategy

- **Mobile-first**: base styles target the smallest viewport, layer up with `min-width`.
- **Minimum supported width: 320px**. Base styles must look correct at 360px.
- Use **CSS Grid** for page-level and complex 2D layouts.
- Use **Flexbox** for single-axis alignment and distribution.
- **Fixed pixel widths are allowed for structural landmarks** — sidebars, navigation panels,
  toolbars — where consistency matters. Use `max-width` / `min-width` / fluid units / `fr`
  for content areas and containers that must adapt.

### Breakpoints

Keep the breakpoint set **minimal** — only add breakpoints when the design genuinely
needs them. Two breakpoints (mobile + desktop) cover most fullscreen-app scenarios.
Add a third only when tablet/intermediate behavior is clearly distinct.

Define breakpoints as SCSS variables in `_breakpoints.scss` (or project-level variables file):

```scss
// Core breakpoints (always present)
$breakpoint-md: 768px;   // tablet — use only if layout genuinely differs
$breakpoint-lg: 1024px;  // desktop — primary switch point

// Optional — add only when justified:
// $breakpoint-xl: 1280px;
// $breakpoint-xxl: 1440px;
```

Use `@media` with `min-width` (mobile-first):

```scss
.product-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--src-layout-gap-var-md, 16px);

  @media (min-width: $breakpoint-lg) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
```

### Grid columns: `minmax(0, 1fr)` not bare `1fr`

`1fr` is shorthand for `minmax(auto, 1fr)`. The `auto` minimum means the track
cannot shrink below its content's intrinsic `min-content` size — wide content
(long strings, images, `<pre>` blocks) will stretch the column and break the layout.

`minmax(0, 1fr)` sets the minimum to `0`, allowing the track to shrink freely.
**Always use `minmax(0, 1fr)` instead of bare `1fr`.**

### Auto-fill / auto-fit grids

The **preferred approach** for any list or menu that displays items in a grid.
Covers ~90% of grid cases without extra breakpoints:

```scss
// Self-adapting grid — items wrap automatically
.swatch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--src-layout-gap-const-sm, 8px);
}

// auto-fit: items stretch to fill remaining space
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--src-layout-gap-var-md, 16px);
}
```

`auto-fill` creates empty tracks if space allows; `auto-fit` collapses empty tracks
so items stretch. Use `auto-fit` for menus/navs (stretch to fill),
`auto-fill` for content grids (consistent item sizes).

### Container queries

Use `@container` only when:
- A component genuinely lives inside containers of **different widths** within the same app.
- The viewport breakpoint would give the wrong answer because the component's
  available space differs from the viewport.

For the typical fullscreen layout (fixed sidebar + fluid content), prefer `@media` breakpoints.

```scss
// USE container query: component reused in sidebar (260px) AND main content (fluid)
.stat-widget {
  container-type: inline-size;
}

.stat-widget__body {
  flex-direction: column;

  @container (min-width: 400px) {
    flex-direction: row;
  }
}

// DON'T USE container query: top-level layout panels — use @media instead
```

### Touch targets

Ensure interactive elements are at least **44×44px** on mobile
(tap area, not necessarily visual size — `padding` counts).

---

## 4. Units

- **All sizes in `px`** — no `rem`, no `em`. Pixels give explicit control.
- **`fr`** is for CSS Grid tracks only.
- Design tokens provide the base values in `px`; components consume them via `var()`.

---

## 5. Typography sizing

For fullscreen apps with a known screen-size range, prefer explicit token-based
font sizes per breakpoint over fluid `clamp()`:

```scss
.page-title {
  font-size: var(--src-font-size-lg, 20px);

  @media (min-width: $breakpoint-lg) {
    font-size: var(--src-font-size-xl, 24px);
  }
}
```

`clamp()` is acceptable for marketing / content-heavy pages but is **not the default**
for app UIs where precise control matters.

---

## 6. Scroll patterns

### Native scroll first

Use native CSS scroll (`overflow-x: auto` + `scroll-snap-type`) for horizontal
scrollable areas. Only use SwiperJS when the user explicitly requests advanced
carousel features (pagination, autoplay, parallax). Never add SwiperJS proactively.

```scss
// Native scroll-snap for horizontal swatch strip
.swatch-strip {
  display: flex;
  gap: var(--src-layout-gap-const-sm, 8px);
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;

  > * {
    scroll-snap-align: start;
    flex-shrink: 0;
  }
}
```

### Vertical scroll containers

```scss
.scrollable-panel {
  overflow-y: auto;
  overflow-x: hidden;
}
```

### Horizontal scroll containers

```scss
.horizontal-list {
  display: flex;
  gap: var(--src-layout-gap-const-sm, 8px);
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
```

> **Note:** scrollbar *styling* (colors, `scrollbar-width`) is defined in the
> `scss-design-system` skill. This section covers scroll *behavior* and layout patterns.

---

## 7. Accessibility (visual) — nice-to-have

Accessibility is desirable but **not a blocker**. Apply these when it is low-effort;
skip if it adds significant complexity:

- Visible focus states on interactive elements (never `outline: none` without a replacement).
- Hover / active / disabled states should be visually distinct.
- Respect `prefers-reduced-motion` when animations are present:

```scss
@media (prefers-reduced-motion: no-preference) {
  .product-card {
    transition: transform 0.2s ease;
  }
}
```

- Color contrast (WCAG AA) — aim for it but do not block implementation.
- `prefers-color-scheme` / dark-light theme adaptation — **deferred**, add separately
  when needed. Do not implement theme switching unless explicitly requested.

---

## 8. Anti-patterns (quick reference)

| Anti-pattern | Correct approach |
|---|---|
| Bare `1fr` in grid columns | `minmax(0, 1fr)` — prevents content from stretching tracks |
| `rem` or `em` units | `px` (or `fr` for grid tracks) |
| Desktop-first media queries (`max-width`) | Mobile-first with `min-width` |
| Fixed-width content containers | Fluid sizing; fixed widths only for sidebars/toolbars |
| Styling `:host` in component SCSS | Use a wrapper element inside the template |
| `host` property in `@Component` | Remove; use wrapper element |
| Putting classes on `<app-*>` components | Style from inside; parent handles layout via grid |
| Inline `styles` in `@Component` | Separate `.scss` file always |
| Rewriting Angular templates for styling | Work with existing DOM; request minimal changes only |
| `outline: none` without replacement | Always provide a visible focus indicator |
| Adding SwiperJS for simple scroll | Native `overflow-x: auto` + `scroll-snap-type` first |
| `clamp()` for app UI font sizes | Explicit token-based sizes per breakpoint |
| Utility-class BEM modifiers | Keep as component overrides — modifiers named after a single CSS property are forbidden |
