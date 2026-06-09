---
name: metabox-unit
description: Vitest unit test writing for Angular 21 — components, services, stores, directives, helpers; project-specific mocking patterns
---

# Skill: Unit Test Writing (Vitest)

## Trigger

Activate this skill when the user asks to:
- Write or fix unit tests for a component, service, store, directive, or helper
- Add vitest spec coverage
- Scaffold a `.spec.ts` file
- Investigate or fix a failing vitest spec
- Run unit tests or check coverage

## Project Scope

**Work ONLY with files inside `metabox/`.** Never read, analyze, or reference files from neighboring workspace projects.

## Project Context

- **Framework**: Angular 21, standalone components, OnPush change detection
- **Test runner**: `@angular/build:unit-test` (Vitest under the hood, configured in `angular.json` — no `vitest.config.ts`)
- **State management**: NgRx Signal Store
- **Spec convention**: co-located alongside source — `foo.ts` → `foo.spec.ts`
- **No constructor injection** in source code — use `inject()` everywhere; mock via providers

## Commands

Run all commands from the project root:

| Command | Purpose |
|---|---|
| `pnpm test` | Run all unit tests (no-watch). **Always use this — never raw `pnpm exec vitest run`** |
| `pnpm test:coverage` | Run with coverage report |
| `pnpm test:watch` | Watch mode for local development |

**IMPORTANT: Always run `pnpm test` after writing or modifying specs** to verify they pass before marking the task complete.

---

## Critical Rules

These rules override common instincts. Violating them causes hard-to-debug failures.

### 1. Fake Timers Lifecycle

`vi.useFakeTimers()` **must be called before `TestBed.configureTestingModule()`** — zone.js initialises when TestBed is created; fake timers must already be active or zone.js will run with real timers and setTimeout-based tests will hang forever.

```typescript
beforeEach(() => {
  vi.useFakeTimers();                          // 1. FIRST — before TestBed
  vi.clearAllMocks();
  TestBed.configureTestingModule({ ... });
  fixture = TestBed.createComponent(MyComponent);
  fixture.detectChanges();
});

afterEach(() => {
  fixture.destroy();     // 2. destroy BEFORE useRealTimers
  vi.useRealTimers();    // 3. restore real timers AFTER destroy
  vi.restoreAllMocks();
});
```

**Why destroy before useRealTimers?** `takeUntilDestroyed` subscriptions fire during fixture teardown. If real timers are already restored, any pending `delay()` or `timer()` inside the component runs with real timers and triggers an async RPC to log to the console — this races against environment teardown and produces `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was pending`.

Advance fake time synchronously in tests:
```typescript
vi.advanceTimersByTime(200);   // use this
// NOT: await vi.runAllTimersAsync()
```

Set fake system time (for `new Date()` or `Date.now()` assertions):
```typescript
vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
```

### 2. `@3dsource` Package Mocking — centralized in `src/test-mocks.ts`

`@3dsource/angular-unreal-module` and `@3dsource/utils` read `window` at module evaluation time, so any spec that touches them needs a `vi.mock`. Historically every spec inlined its own factory with a *subset* of the exports it cared about — and under the `@angular/build:unit-test` parallel runner the wrong subset would sometimes win across bundles, producing intermittent `No "Logger" export defined on the "@3dsource/utils" mock` / `No "resetUserInactivityTimeout" export defined…` failures.

The repo now declares **one canonical mock per module** in `src/test-mocks.ts`, registered via the builder's `setupFiles` option in `angular.json`. Every spec inherits the canonical surface automatically — **do not call `vi.mock('@3dsource/utils', …)` or `vi.mock('@3dsource/angular-unreal-module', …)` in individual specs**. (Other modules like `jspdf`, `@apollo/client`, `html2canvas` still get spec-local `vi.mock` calls; the global file is exclusively for the two `window`-crashing `@3dsource/*` packages.)

`@3dsource/types-unreal` is type-only — no mock needed; import directly.

#### Adding a new name

If a source file starts importing a new export from one of these packages (and a spec exercises it), append it to the appropriate factory in `src/test-mocks.ts`. That's the only place. The factory follows three conventions:

- **DI tokens (services) → classes** so TestBed `provide: VideoService` resolves.
- **Selectors → plain strings** so the NgRx Store mock can route by identity (see §3).
- **NgRx actions → real `createAction(...)`** so `expect(dispatch).toHaveBeenCalledWith(myAction())` compares against a real instance.

#### Customizing a mocked function per-test

For specs that need to override a specific return value, import the name normally and use `vi.mocked(...)` inside `beforeEach`:

```typescript
import { fitIntoRectangle } from '@3dsource/utils';
beforeEach(() => {
  vi.mocked(fitIntoRectangle).mockReturnValue({ w: 100, h: 100, x: 0, y: 0, scale: 1 });
});
```

For action assertions, just import the action creator — it's a real `createAction`, so calling it returns the same shape the source produced:

```typescript
import { resetUserInactivityTimeout } from '@3dsource/angular-unreal-module';
expect(mockStore.dispatch).toHaveBeenCalledWith(resetUserInactivityTimeout());
```

#### Hoisting rule (still applies for other `vi.mock` calls)

`vi.mock()` factories are hoisted to the top of the file by Vitest. **Never reference variables declared outside the factory inside it** — those variables don't exist yet at hoist time and cause `"Cannot access '__vi_import_N__' before initialization"`.

### 3. NgRx Store Mock (for services that inject Store)

When the source imports selectors from `@3dsource/angular-unreal-module` (mocked as strings), the mock store can route by string identity:

```typescript
const freezeFrameFromVideo$ = new BehaviorSubject<string | null>(null);
const freezeFrame$ = new Subject<string | null>();

const mockStore = {
  dispatch: vi.fn(),
  select: vi.fn((selector: unknown) => {
    if (selector === 'selectFreezeFrameFromVideo') return freezeFrameFromVideo$.asObservable();
    if (selector === 'selectFreezeFrame') return freezeFrame$.asObservable();
    if (selector === 'selectStreamResolution') return of({ width: 1920, height: 1080 });
    return of(null);
  }),
};
```

- Use `BehaviorSubject` for selectors that need an initial/current value
- Use `Subject` for event streams
- Return `.asObservable()`, not the Subject directly

**Asserting dispatched actions — avoid `expect.objectContaining()`:**
```typescript
// WRONG — causes PrettyFormatPluginError
expect(mockStore.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: '[X] Foo' }));

// CORRECT — filter calls by type
const call = mockStore.dispatch.mock.calls.find(([a]) => a.type === '[X] Foo');
expect(call).toBeDefined();
```

### 4. Angular Build Bundles Component and Spec Separately

The `@angular/build:unit-test` builder bundles each component file independently from its spec file. This means `vi.mock('some-lib')` in a spec affects only the spec file's import — **the component's bundled copy of the same library is a separate module instance and is NOT mocked**.

Consequence: you cannot intercept library calls made inside a component by mocking in the spec. Test observable behavior (DOM output, emitted events) instead of internal library calls.

---

## Patterns by Subject Type

### Pure Helper / Utility Function

No TestBed. Direct import and call. Cover edge cases and boundary values.

```typescript
import { describe, expect, it } from 'vitest';
import { myHelper } from './my-helper';

describe('myHelper', () => {
  it('should return X for input Y', () => {
    expect(myHelper('Y')).toBe('X');
  });
});
```

### Component

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { MyComponent } from './my.component';
import { MyStore } from './my.store';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  const mockStore = {
    items: signal([]),
    isLoading: signal(false),
    load: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [{ provide: MyStore, useValue: mockStore }],
      schemas: [NO_ERRORS_SCHEMA],   // ignore child components
    });
    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Test');
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

- Use `signal()` directly when building the mock store object — matches the type expected by `inject(MyStore)`
- `fixture.componentRef.setInput('name', value)` for required signal inputs
- `NO_ERRORS_SCHEMA` suppresses unknown element errors from child components
- **Do not add fake timers** unless the component uses `setTimeout`, `setInterval`, `delay()`, or `timer()` — it adds unnecessary complexity

### Service

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MyService } from './my.service';
import { HttpClient } from '@angular/common/http';

describe('MyService', () => {
  let service: MyService;
  const mockHttp = { get: vi.fn(), post: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        MyService,
        { provide: HttpClient, useValue: mockHttp },
      ],
    });
    service = TestBed.inject(MyService);
  });

  it('should call http.get', () => {
    mockHttp.get.mockReturnValue(of({ data: [] }));
    service.loadData();
    expect(mockHttp.get).toHaveBeenCalledWith('/api/data');
  });
});
```

### NgRx Signal Store

Provide the real store in TestBed; mock its dependencies (services, HTTP) via providers.

```typescript
import { TestBed } from '@angular/core/testing';
import { MyStore } from './my.store';

describe('MyStore', () => {
  let store: InstanceType<typeof MyStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MyStore,
        { provide: MyApiService, useValue: { getItems: vi.fn().mockReturnValue(of([])) } },
      ],
    });
    store = TestBed.inject(MyStore);
  });

  it('should expose items signal', () => {
    expect(store.items()).toEqual([]);
  });
});
```

### Directive

Wrap the directive in a `TestHostComponent` defined inside the spec. Fake timers go before TestBed. Spy on DOM methods before `detectChanges`.

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyDirective } from './my.directive';

@Component({
  template: `<div myDirective></div>`,
  imports: [MyDirective],
  standalone: true,
})
class TestHostComponent {}

describe('MyDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();   // before TestBed
    TestBed.configureTestingModule({ imports: [TestHostComponent] });
    fixture = TestBed.createComponent(TestHostComponent);
    el = fixture.nativeElement.querySelector('[myDirective]') as HTMLElement;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      width: 100, height: 50, top: 0, left: 0, right: 100, bottom: 50, x: 0, y: 0, toJSON: vi.fn(),
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();     // destroy before useRealTimers
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should apply directive effect after delay', () => {
    el.dispatchEvent(new Event('click'));
    vi.advanceTimersByTime(300);
    expect(el.classList.contains('active')).toBe(true);
  });
});
```

---

## Common Assertions

```typescript
// Value equality
expect(value).toBe(expected);           // strict ===
expect(value).toEqual(expected);        // deep equality
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeTruthy();
expect(typeof fn).toBe('function');     // prefer over toBeTruthy() for outputs

// Collections
expect(array).toHaveLength(3);
expect(string).toContain('substring');

// Mocks
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).not.toHaveBeenCalled();

// DOM (via fixture.nativeElement)
const el: HTMLElement = fixture.nativeElement;
expect(el.querySelector('.my-class')).toBeTruthy();
expect(el.firstElementChild?.classList.contains('active')).toBe(true);
```

---

## Mocking External Libraries

For packages that don't crash (e.g. `jspdf`, `@apollo/client`), use standard `vi.mock()`:

```typescript
// Sync factory — safe for non-window-reading modules
vi.mock('jspdf', () => ({
  jsPDF: class MockJsPDF {
    addImage = vi.fn();
    addPage = vi.fn();
    save = vi.fn();
    output = vi.fn().mockReturnValue('');
  },
}));

// Per-test override of a mock function
vi.mock('@apollo/client', () => ({
  CombinedGraphQLErrors: { is: vi.fn().mockReturnValue(false) },
}));

// Access mock after module import (top-level await)
const { CombinedGraphQLErrors } = await import('@apollo/client');
const isMock = vi.mocked(CombinedGraphQLErrors.is);

// Then in a specific test:
isMock.mockReturnValueOnce(true);
```

---

## Avoiding Common Mistakes

| Mistake | Correct approach |
|---|---|
| `pnpm exec vitest run` | `pnpm test` |
| `vi.useFakeTimers()` after `TestBed` | Call it **before** `TestBed.configureTestingModule()` |
| `vi.useRealTimers()` before `fixture.destroy()` | `fixture.destroy()` first, then `vi.useRealTimers()` |
| `vi.mock('@3dsource/utils', ...)` or `vi.mock('@3dsource/angular-unreal-module', ...)` inside a spec | Both are mocked centrally in `src/test-mocks.ts`; extend that file, never re-mock per-spec |
| `vi.importActual('@3dsource/angular-unreal-module')` | Already mocked globally — just import names normally, override via `vi.mocked(...)` if needed |
| Outer variable in `vi.mock()` factory | Define everything inside the factory |
| `expect.objectContaining()` in action dispatch assertion | Filter `dispatch.mock.calls` by `.type` |
| `expect(output).toBeTruthy()` for Angular output | `expect(typeof output.emit).toBe('function')` |
| `vi.mock('lib')` to intercept component-internal import | Test DOM/output behavior instead |
