---
name: ngrx-signal-store
description: Create NgRx Signal Stores and migrate from classic NgRx (actions/reducers/effects/selectors) to signalStore — metabox conventions, withImmutableState, rxMethod, updateState, immerPatchState patterns
---

# Skill: NgRx Signal Store (Metabox)

## Trigger

Activate this skill when the user asks to:
- Scaffold a new NgRx Signal Store or signal store feature
- Add `withComputed`, `withMethods`, `withHooks`, or `withProps` to an existing store
- Migrate classic NgRx files (actions / reducer / effects / selectors) to Signal Store
- Create a reusable `signalStoreFeature` (e.g. a `withX()` function)
- Understand how stores are structured in this project

## Project Scope

**Work ONLY with files inside `metabox/`.** Never read, analyze, or reference files from neighboring workspace projects.

## Project Context

| Concern | Library / convention |
|---|---|
| Store primitive | `signalStore` from `@ngrx/signals` |
| State (immutable) | `withImmutableState(initialState)` from `@angular-architects/ngrx-toolkit` — **never `withState`** |
| State mutations | `updateState(store, scoped\`action\`, patch)` for flat fields; `immerPatchState` from `ngrx-immer/signals` for nested mutations |
| Scoped logger | `createScopedLogger(feature)` from `@shared/helpers/scoped-logger` — tag every `updateState` call |
| DevTools | `withTreeShakableDevTools(feature)` from `@shared/constants/store.features` — **always first** in composition |
| Notifications | `withToastr('StoreName')` from `@shared/store/toastr.feature` — add to every store |
| Loading state | `withLoading()` from `@shared/store/loading` — add when store has async operations |
| DI in store | `withProps(() => ({ _service: inject(Service) }))` — underscore prefix on all injected deps |
| Async methods | `rxMethod<T>()` from `@ngrx/signals/rxjs-interop` + `tapResponse` from `@ngrx/operators` |
| Reactive effects | `explicitEffect` from `ngxtension/explicit-effect` — used in `withHooks.onInit` |
| Provision | Root/singleton stores: `{ providedIn: 'root' }` as first arg. Feature/component stores: omit it |
| Feature split | Large stores: extract `withMyFeature()` returning `signalStoreFeature(...)` in `my.model.ts` |

---

## Standard Store Scaffold

### File: `feature-name/store/feature-name.store.ts`

```typescript
import {
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
} from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { updateState, withImmutableState } from '@angular-architects/ngrx-toolkit';
import { immerPatchState } from 'ngrx-immer/signals';
import { withTreeShakableDevTools } from '@shared/constants/store.features';
import { withToastr } from '@shared/store/toastr.feature';
import { withLoading } from '@shared/store/loading';
import { createScopedLogger } from '@shared/helpers/scoped-logger';
import { getErrorMessage } from '@shared/helpers/error-message';
import { MyApiService } from '../services/my-api.service';
import type { MyItem } from '../models/my-item.model';

interface MyFeatureState {
  items: MyItem[];
  selectedId: string | null;
}

const initialState: MyFeatureState = {
  items: [],
  selectedId: null,
};

const feature = 'myFeature';
const scoped = createScopedLogger(feature);

export const MyFeatureStore = signalStore(
  { providedIn: 'root' },            // omit for component-level stores
  withTreeShakableDevTools(feature),  // always first
  withImmutableState(initialState),
  withLoading(),
  withToastr('My Feature'),
  withProps(() => ({
    _myApiService: inject(MyApiService),
  })),
  withComputed(({ items, selectedId }) => ({
    selectedItem: computed(() =>
      items().find((i) => i.id === selectedId()) ?? null,
    ),
    totalCount: computed(() => items().length),
  })),
  withMethods((store) => ({
    // Flat field mutation
    setSelectedId(id: string | null) {
      updateState(store, scoped`setSelectedId`, { selectedId: id });
    },
    clear() {
      updateState(store, scoped`clear`, initialState);
    },
    // Nested / array mutation — use immerPatchState
    appendItem(item: MyItem) {
      immerPatchState(store, (state) => {
        state.items.push(item);
      });
    },
  })),
  withMethods((store) => ({
    // Async method using rxMethod
    loadItems$: rxMethod<void>(
      pipe(
        tap(() => store.showLoading()),
        switchMap(() =>
          store._myApiService.getItems().pipe(
            tapResponse({
              next: (items) => {
                store.hideLoading();
                updateState(store, scoped`loadItems`, { items });
              },
              error: (error: unknown) => {
                store.hideLoading();
                store.showErrorToast(getErrorMessage(error).error);
              },
            }),
          ),
        ),
      ),
    ),
  })),
  withHooks({
    onInit(store) {
      store.loadItems$();
    },
    onDestroy(store) {
      store.clear();
    },
  }),
);
```

---

## Patterns Reference

### 1. State + initial state

Always:
- Define an explicit TypeScript `interface` (not `type`)
- Use `null` for optional/missing values, not `undefined`
- Keep `const feature = 'featureName'` and `const scoped = createScopedLogger(feature)` at module level

```typescript
interface MyState {
  data: MyData | null;
  isOpen: boolean;
  searchQuery: string;
}

const initialState: MyState = {
  data: null,
  isOpen: false,
  searchQuery: '',
};

const feature = 'myStore';
const scoped = createScopedLogger(feature);
```

### 2. `withProps` — dependency injection

Prefix every injected dep with `_`. Can use multiple `withProps` blocks.

```typescript
withProps(() => ({
  _router: inject(Router),
  _myService: inject(MyService),
  _myGQL: inject(MyQueryGQL),
})),
```

### 3. `withComputed` — derived signals

Use `computed()` from `@angular/core`. Chain multiple `withComputed` blocks when later ones depend on earlier computed signals.

```typescript
// Block 1 — base computeds from raw state
withComputed(({ user, currentClientId }) => ({
  activeClientId: computed(() => currentClientId() || user()?.company?.id || null),
  userRoles: computed(() => user()?.roles || []),
})),
// Block 2 — computeds that depend on block 1
withComputed((store) => ({
  isAdmin: computed(() =>
    store.userRoles().includes(UserRolesEnum.RoleAdmin),
  ),
})),
```

### 4. `withMethods` — synchronous mutations

Use `updateState` for flat fields, `immerPatchState` for nested/array mutations.

```typescript
withMethods((store) => ({
  // Flat replacement
  setSearchQuery(searchQuery: string) {
    updateState(store, scoped`setSearchQuery`, { searchQuery });
  },
  // Functional update (spread pattern)
  updatePartial(patch: Partial<MyData>) {
    updateState(store, scoped`updatePartial`, (state) => ({
      data: { ...state.data, ...patch },
    }));
  },
  // Nested mutation — immerPatchState
  appendToList(item: ListItem) {
    immerPatchState(store, (state) => {
      state.list.items.push(item);
      state.list.total += 1;
    });
  },
  // Method calling another method in the SAME block — use `this`
  resetSearch() {
    this.setSearchQuery('');
    this.setSelectedId(null);
  },
})),
// Methods from an earlier withMethods block are available on `store` here.
// Cross-block calls go in a later block, not earlier ones.
```

### 5. `rxMethod` — async operations

Always: `tap(() => store.showLoading())` before the async op, `store.hideLoading()` in both `next` and `error` branches, `tapResponse` for error handling.

```typescript
withMethods((store) => ({
  loadData$: rxMethod<{ id: string }>(
    pipe(
      tap(() => store.showLoading()),
      switchMap(({ id }) =>
        store._myGQL.fetch({ variables: { id } }).pipe(
          tapResponse({
            next: (response) => {
              store.hideLoading();
              updateState(store, scoped`loadData`, {
                data: response.data?.item ?? null,
              });
            },
            error: (error: unknown) => {
              store.hideLoading();
              store.showErrorToast(getErrorMessage(error).error);
            },
          }),
        ),
      ),
    ),
  ),
  // Mutation (POST/PUT)
  saveItem$: rxMethod<MyItem>(
    pipe(
      switchMap((item) =>
        store._myService.save(item).pipe(
          tapResponse({
            next: () => {
              store.showSuccessToast('Saved successfully');
              store.loadData$({ id: item.id });
            },
            error: (error: unknown) =>
              store.showErrorToast(getErrorMessage(error).error),
          }),
        ),
      ),
    ),
  ),
})),
```

### 6. `withHooks` — lifecycle

```typescript
withHooks({
  onInit(store) {
    // Start data loading
    store.loadData$();

    // React to signal changes
    explicitEffect([store._userStore.activeClientId], ([clientId]) => {
      if (clientId) {
        store.reload$();
      }
    });
  },
  onDestroy(store) {
    store.clear();
  },
}),
```

### 7. Reusable `signalStoreFeature`

Create in `src/app/shared/store/` when a behaviour is shared across 3+ stores.

```typescript
// with-my-feature.ts
import { inject } from '@angular/core';
import { signalStoreFeature, withMethods } from '@ngrx/signals';
import { updateState, withImmutableState } from '@angular-architects/ngrx-toolkit';
import { createScopedLogger } from '@shared/helpers/scoped-logger';

interface MyFeatureState {
  isExpanded: boolean;
}

const initialState: MyFeatureState = { isExpanded: false };
const feature = 'expanded';
const scoped = createScopedLogger(feature);

export function withExpanded() {
  return signalStoreFeature(
    withImmutableState(initialState),
    withMethods((store) => ({
      expand() {
        updateState(store, scoped`expand`, { isExpanded: true });
      },
      collapse() {
        updateState(store, scoped`collapse`, { isExpanded: false });
      },
      toggleExpanded() {
        updateState(store, scoped`toggle`, (state) => ({
          isExpanded: !state.isExpanded,
        }));
      },
    })),
  );
}
```

### 8. Feature store split (large stores)

For stores with 200+ lines, extract the model into `feature-name.model.ts`:

```typescript
// feature-name.model.ts
export function withFeatureNameModel() {
  return signalStoreFeature(
    withTreeShakableDevTools(feature),
    withImmutableState(initialState),
    withLoading(),
    withToastr('Feature Name'),
    withProps(() => ({
      _service: inject(MyService),
    })),
    withComputed(/* ... */),
    withMethods(/* sync methods */),
    withMethods(/* async rxMethods */),
  );
}

// feature-name.store.ts
export const FeatureNameStore = signalStore(
  withFeatureNameModel(),
  // additional store-level methods or hooks
  withHooks({
    onInit(store) {
      store.loadData$();
    },
  }),
);
```

### 9. Component injection

```typescript
@Component({
  // ...
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyFeatureComponent {
  private readonly myStore = inject(MyFeatureStore);

  readonly items = this.myStore.items;          // signal — use as items() in template
  readonly isLoading = this.myStore.isLoading;  // signal from withLoading()

  load() {
    this.myStore.loadItems$();
  }
}
```

---

## Migration: Classic NgRx → Signal Store

### Mapping table

| Classic NgRx | Signal Store |
|---|---|
| `interface State` + `initialState` | Same interface + `withImmutableState(initialState)` |
| `createFeature({ name, reducer })` | `signalStore({ providedIn: 'root' }, ...)` |
| `createAction('...')` | Deleted — methods replace actions |
| `createReducer(initialState, on(action, handler))` | `withMethods` + `updateState` / `immerPatchState` |
| `createImmerReducer(initialState, on(...))` | `immerPatchState` inside `withMethods` |
| `createSelector(feature.selectX, ...)` | `withComputed(() => ({ x: computed(...) }))` |
| `@Injectable() class XEffects` | `withMethods` with `rxMethod` |
| `createEffect(() => actions$.pipe(ofType(A), ...))` | `rxMethod<void>(pipe(...))` |
| `concatLatestFrom(() => store.select(selectX))` | Read signal directly: `store.x()` |
| `this.store.dispatch(action({ data }))` in component | `store.method(data)` |
| `this.store.select(selector)` in component | `store.computedSignal()` (synchronous) |
| `{ dispatch: false }` navigation effect | `tapResponse.next` with `inject(Router).navigate(...)` or `withHooks.onInit` |
| `concatLatestFrom` for selector reads | Direct signal reads inside `rxMethod` body |

### Step-by-step migration procedure

Given a feature with `feature.actions.ts`, `feature.reducer.ts`, `feature.effects.ts`, `feature.selectors.ts`, `feature.feature.ts`:

**Step 1 — Copy state interface**
Copy the existing `interface State` and `initialState` unchanged.

**Step 2 — Replace `createFeature` with `signalStore`**
```typescript
// Before
export const myFeature = createFeature({ name: 'my', reducer: myReducer });

// After
export const MyStore = signalStore(
  { providedIn: 'root' },
  withTreeShakableDevTools('my'),
  withImmutableState(initialState),
  withToastr('My'),
  // ...
);
```

**Step 3 — Convert each `on()` handler to a method**
```typescript
// Before (reducer)
on(setSearchQuery, (state, { searchQuery }) => {
  state.searchQuery = searchQuery;
  return state;
}),

// After (withMethods)
setSearchQuery(searchQuery: string) {
  updateState(store, scoped`setSearchQuery`, { searchQuery });
},
```

For Immer-based handlers:
```typescript
// Before
on(appendItem, (state, { item }) => {
  state.items.push(item);   // immer mutation
  state.total += 1;
  return state;
}),

// After
appendItem(item: MyItem) {
  immerPatchState(store, (s) => {
    s.items.push(item);
    s.total += 1;
  });
},
```

**Step 4 — Convert selectors to `withComputed`**
```typescript
// Before
export const selectSearchQuery = createSelector(
  myFeature.selectState,
  (state) => state.searchQuery,
);
export const selectFilteredItems = createSelector(
  myFeature.selectItems,
  myFeature.selectSearchQuery,
  (items, query) => items.filter((i) => i.name.includes(query)),
);

// After
withComputed(({ items, searchQuery }) => ({
  filteredItems: computed(() =>
    items().filter((i) => i.name.includes(searchQuery())),
  ),
})),
```

**Step 5 — Convert effects to `rxMethod`**
```typescript
// Before (effect)
loadData$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadData),
    concatLatestFrom(() => [
      this.store.select(myFeature.selectCurrentId),
    ]),
    switchMap(([, id]) =>
      this.myGQL.fetch({ variables: { id } }).pipe(
        mapResponse({
          next: (res) => loadDataSuccess({ data: res.data?.item }),
          error: (err) => loadDataFailure({ error: getErrorMessage(err).error }),
        }),
      ),
    ),
  ),
);

// After (rxMethod — reads state signals directly, no concatLatestFrom needed)
loadData$: rxMethod<void>(
  pipe(
    tap(() => store.showLoading()),
    switchMap(() =>
      store._myGQL.fetch({ variables: { id: store.currentId() } }).pipe(
        tapResponse({
          next: (res) => {
            store.hideLoading();
            updateState(store, scoped`loadData`, { data: res.data?.item ?? null });
          },
          error: (error: unknown) => {
            store.hideLoading();
            store.showErrorToast(getErrorMessage(error).error);
          },
        }),
      ),
    ),
  ),
),
```

**Step 6 — Convert `{ dispatch: false }` navigation effects**
```typescript
// Before
redirectAfterCreate$ = createEffect(
  () => this.actions$.pipe(
    ofType(createSuccess),
    tap(({ id }) => this.router.navigate(['/items', id])),
  ),
  { dispatch: false },
);

// After — inline in the success branch of the rxMethod
tapResponse({
  next: (res) => {
    updateState(store, scoped`create`, { /* ... */ });
    void store._router.navigate(['/items', res.data?.create.id]);
  },
  error: (error: unknown) =>
    store.showErrorToast(getErrorMessage(error).error),
}),
```

**Step 7 — Update components**
```typescript
// Before
this.store.dispatch(loadData());
this.data$ = this.store.select(selectFilteredItems);

// After
this.myStore.loadData$();
readonly filteredItems = this.myStore.filteredItems; // signal
```

**Step 8 — Add `withHooks` for startup calls**
```typescript
withHooks({
  onInit(store) {
    store.loadData$();
  },
}),
```

**Step 9 — Clean up**
Delete: `feature.actions.ts`, `feature.reducer.ts`, `feature.effects.ts`, `feature.selectors.ts`, `feature.feature.ts`.
Remove from `providers` in `app.config.ts` or route providers: `provideEffects([XEffects])`, `provideState(xFeature)`.

---

## Avoiding Common Mistakes

| Mistake | Correct |
|---|---|
| `withState(initialState)` | `withImmutableState(initialState)` from `@angular-architects/ngrx-toolkit` |
| `patchState(store, { x })` | `updateState(store, scoped\`name\`, { x })` |
| Unlabeled `updateState` | Always pass `scoped\`actionName\`` as second arg |
| Mutating nested objects with `updateState` | Use `immerPatchState` for nested/array mutations |
| Omitting `withTreeShakableDevTools` | Always first in the `signalStore` composition |
| Omitting `withToastr` | Add to every store that has async operations |
| Reading store values with `concatLatestFrom` inside rxMethod | Read signal directly: `store.mySignal()` |
| Missing `tapResponse` in rxMethod | Always wrap API calls with `tapResponse` |
| Calling `withComputed` referencing a signal from another `withComputed` in the same block | Chain separate `withComputed` blocks |
| `{ providedIn: 'root' }` on feature/component stores | Only root singletons; component stores have no `providedIn` |
| Constructor injection | Use `inject()` only — no constructor DI anywhere |
| `subscribe()` in components | Use store signals directly; never subscribe in components |
