# AGENTS.md

## Project Overview

Metabox is a 3D asset management platform (Angular 21, **zoneless**, standalone components). It manages products, environments, materials, renders, and configurator streams via three GraphQL APIs (`legacy`, `default`/metabox-v2, `ecom`) configured as named Apollo clients in `src/app/app.config.ts` (`provideNamedApollo` with `legacy`, `default`, `ecom` keys).

**Requirements:** Node.js >=22.22.0, pnpm.

## Architecture

- **Feature-based structure**: `src/app/features/{feature}/` — features typically contain a subset of `{layout, container, template, components, store, services, helpers, constants, interfaces, guards}`. Simpler features may only have `{layout, store}` or `{components, store}`.
- **Configurator variants**: `configurator-manager` and `configurator-stream` features each split into `basic/`, `modular/`, and `shared/` subdirectories. Stream variants also have `api_vN/` directories (e.g. `api_v3/`) that host the post-message API surface — `services/`, `actions/`, `helpers/`.
- **Shared layer**: `src/app/shared/` — reusable components, services, guards, helpers, store features, pipes, directives, constants, tokens, utils.
- **Path aliases** (see `tsconfig.json` `paths`):
  - `@features/*` → `src/app/features/*`
  - `@shared/*` → `src/app/shared/*`
  - `@utils/*` → `src/app/shared/utils/*`
  - `@graphql/*` → `graphql/*`
  - `@e2e/*` → `e2e/*`
- **Routing**: `app.routes.ts` → public routes (configurator-stream, sign-in, viewer). Authenticated routes lazy-load through `layout/constants/layout.routes.ts`, which wraps child features inside `LayoutComponent` (header + side nav + router-outlet).
- **Zoneless**: The app uses `provideZonelessChangeDetection()`. All components MUST use `ChangeDetectionStrategy.OnPush`. In tests, `fixture.detectChanges()` does not auto-fire `afterNextRender` callbacks unless the application is ticked — use `await fixture.whenStable()` or `TestBed.inject(ApplicationRef).tick()` when the component logic depends on render hooks.

## State Management — NgRx Signal Store

Stores use `signalStore()` from `@ngrx/signals` composed with reusable custom features. Example shape (from `products.store.ts`):

```ts
export const ProductsStore = signalStore(
  withTreeShakableDevTools(FEATURE_NAME), // @shared/constants/store.features
  withImmutableState(initialState), // @angular-architects/ngrx-toolkit
  withLoading(), // @shared/store/loading
  withQueryParamPage(), // @shared/store/query-param-page
  withScrollRestore(FEATURE_NAME), // @shared/store/scroll-restore
  withToastr('Feature'), // @shared/store/toastr.feature
  withProps(() => ({
    /* inject services */
  })),
  withComputed(/* derived signals */),
  withMethods(/* actions */),
  withEventHandlers(/* @ngrx/signals/events */),
  withHooks(/* lifecycle */),
);
```

- Use `updateState()` from `@angular-architects/ngrx-toolkit` together with `createScopedLogger` for labeled state updates that show up in DevTools.
- Use `immerPatchState()` from `ngrx-immer/signals` for deep immutable updates.
- Use `rxMethod()` from `@ngrx/signals/rxjs-interop` for reactive side effects.
- Use `withEventHandlers()` + `store._events.on(...)` for cross-store event-driven flows.

## GraphQL Code Generation

- Schema files: `graphql/legacy.graphql`, `graphql/metabox.graphql`, `graphql/ecom.graphql` (fetched via `pnpm get:legacy`, `get:metabox`, `get:ecom`).
- The `metabox.graphql` schema generates into `graphql/default/` and is consumed via the `default` Apollo client.
- Queries / mutations / fragments live as `.graphql` files under `graphql/{legacy,default,ecom}/{queries,mutations,fragments}/`.
- `pnpm generate` produces `types.ts`, `services.ts`, `operations.ts`, and `generated-mocks.ts` in each API directory.
- **Never edit generated files** — modify `.graphql` sources and re-run codegen.
- Import types from `@graphql/default/types`, services from `@graphql/default/services`, mocks from `@graphql/default/generated-mocks`, etc.

## Commands

| Task                                         | Command                  |
| -------------------------------------------- | ------------------------ |
| Dev server (SSL)                             | `pnpm serve:ssl`         |
| Dev server (SSL, network-exposed)            | `pnpm serve:sslIp`       |
| Full start (fetch schemas + codegen + serve) | `pnpm start:ssl`         |
| Production build                             | `pnpm build:prod`        |
| Production build with bundle analyzer        | `pnpm build:stats`       |
| Unit tests (Vitest via Angular builder)      | `pnpm test`              |
| Unit tests (watch mode)                      | `pnpm test:watch`        |
| Unit tests with coverage                     | `pnpm test:coverage`     |
| E2E tests (Playwright)                       | `pnpm e2e`               |
| E2E tests (UI mode)                          | `pnpm e2e:ui`            |
| Lint                                         | `pnpm lint`              |
| Format code                                  | `pnpm prettier`          |
| GraphQL codegen                              | `pnpm generate`          |
| GraphQL codegen (watch mode)                 | `pnpm generate:watch`    |
| Fetch all schemas (no codegen)               | `pnpm prepare:data`      |
| Fetch all schemas + codegen                  | `pnpm wait:prepare:data` |

## Coding Conventions

- **No NgModules, no CommonModule** — all components are standalone (do not set `standalone: true` explicitly; it's the v21 default).
- **Templates**: use `@if` / `@for` / `@switch` control flow, never `*ngIf` / `*ngFor`.
- **DI**: use the `inject()` function, never constructor injection.
- **Component inputs / outputs**: use `input()` signal and `output()` function, not `@Input` / `@Output` decorators.
- **Host bindings**: use the `host` property in `@Component` / `@Directive`, not `@HostBinding` / `@HostListener`.
- **Styles**: use `class.foo` / `style.bar` bindings, not `ngClass` / `ngStyle`.
- **File layout**: template in `.html`, styles in `.scss`, logic in `.ts` (small inline templates are an acceptable exception).
- **No `subscribe()` in components** — use `rxMethod`, `effect()`, the async pipe, or signal-based patterns.
- **Change detection**: every component uses `ChangeDetectionStrategy.OnPush` (enforced by schematics; the project is zoneless).
- **API calls** flow through services, never directly from components.
- **Avoid implicit `any`**, prefer `type`/`interface` imports.

## Testing

### Unit tests — Vitest via `@angular/build:unit-test`

- The test builder is configured in `angular.json` (`architect.test.builder: "@angular/build:unit-test"`); there is **no** separate `vitest.config.ts`. The test environment bootstraps from `src/test.ts`.
- Always invoke tests through pnpm: `pnpm test`. Raw `pnpm exec vitest run` will not pick up the Angular builder setup.
- Specs are co-located: `foo.ts` → `foo.spec.ts`.

Key rules (more detail in `.claude/skills/metabox-unit`):

- **Mock window-crashing modules**: `@3dsource/angular-unreal-module` and `@3dsource/utils` read `window` at module evaluation time. Provide a full async/sync factory mock (Logger, ImageOutput, selectors-as-strings, DI classes) — never use `vi.importActual` on them. `@3dsource/types-unreal` is safe to import directly.
- **Fake-timer lifecycle**: call `vi.useFakeTimers()` BEFORE `TestBed.configureTestingModule()` (zone.js init); in `afterEach` destroy the fixture FIRST, then call `vi.useRealTimers()`. A spec that uses fake timers but never restores them will leak fake timers into every later spec and cause unrelated specs to time out — always restore in `afterEach`.
- **NgRx Store mock**: when the source imports selectors from `@3dsource/angular-unreal-module` (mocked as plain strings), the test `Store.select` mock can route by string identity using `Subject`/`BehaviorSubject`. Avoid `expect.objectContaining()` when asserting dispatched actions — filter `dispatch.mock.calls` by `.type` instead.
- **Builder bundling caveat**: the Angular builder bundles each spec independently. A `vi.mock('some-lib')` in one spec doesn't necessarily reach into another file's bundled copy — assert observable behavior (DOM/output) rather than internal library calls when possible.

### E2E tests — Playwright

- Page Object Model under `e2e/features/{feature}/`. Auth setup in `e2e/helpers/auth.setup.ts`.
- All network is mocked: `intercept-gql.ts`, `intercept-rest.ts`, `multipart-upload.ts`. Helpers: `assert-loading.ts`, `base-test.ts`, `cdk-drag-drop.ts`, `parse-request.ts`.
- Coverage is collected via the `E2E_COVERAGE=1` env var set by `pnpm e2e` / `pnpm e2e:ui`; merge with `pnpm e2e:merge`.

## Key Files

- `src/app/app.config.ts` — app providers (`provideZonelessChangeDetection`, named Apollo clients, Sentry, NgRx Store, Toastr).
- `src/app/app.routes.ts` — top-level public routing.
- `src/app/features/layout/constants/layout.routes.ts` — authenticated feature routes.
- `src/app/shared/store/` — reusable signal store features:
  - `loading.ts`, `global-loading.ts`
  - `toastr.feature.ts`
  - `query-param-page.ts`
  - `scroll-restore.ts`
  - `track-telemetry.ts` (mixpanel + telemetry events)
  - `global-camera.store.ts`
  - `router.selectors.ts`
- `src/app/shared/constants/store.features.ts` — `withTreeShakableDevTools` (environment-based DevTools toggling).
- `src/test.ts` — Angular testing platform bootstrap (Vitest entry).
- `codegen.ts` — GraphQL codegen configuration for all three API endpoints.
- `sheriff.config.ts` — module boundary enforcement.
- `src/environments/` — environment configs: `environment.ts`, `environment.prod.ts`, `environment.staging.ts`, `environment.qa.ts`, `environment.playwright.ts`, `environment.local.prod.ts`, `environment.local.unreal.ts`.
