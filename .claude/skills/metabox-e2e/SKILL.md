---
name: e2e-tests
description: Playwright E2E testing with Page Objects, mocks, and comprehensive coverage
---

# E2E Test Writing (Playwright)

## When to Use

- Create/update E2E tests for any feature
- Write Playwright specs
- Add test coverage
- Fix broken tests after component changes

## Architecture

- **Framework**: Playwright + TypeScript
- **Pattern**: Page Object Model + two-layer mocking (data + setup class)
- **Auth**: Storage state files per role (`ROLE_SUPER_ADMIN`, `ROLE_COMPANY_ADMIN`, `ROLE_COMPANY_USER`)
- **Mocking**: All GraphQL/REST intercepted via `page.route()`
- **Selectors**: `data-testid` via `page.getByTestId()` (primary), `page.getByText()` (text assertions), `page.getByPlaceholder()` (last resort)

## Key Files Reference

| Purpose | Path |
|---|---|
| Playwright config | `playwright.config.ts` |
| Feature fixtures | `e2e/features/index.ts` |
| Auth setup | `e2e/helpers/auth.setup.ts` |
| GQL interceptor | `e2e/helpers/intercept-gql.ts` |
| REST interceptor | `e2e/helpers/intercept-rest.ts` |
| GQL interceptor interface | `e2e/interfaces/intercept-gql.interface.ts` |
| Base test (coverage) | `e2e/helpers/base-test.ts` |
| Config constants | `e2e/constants/config.ts` |
| Default GraphQL operations | `graphql/default/operations.ts` |
| Default mock builders | `graphql/default/generated-mocks.ts` |
| Legacy GraphQL operations | `graphql/legacy/operations.ts` |
| Legacy mock builders | `graphql/legacy/generated-mocks.ts` |
| Route constants | `src/app/shared/constants/routing-paths.constants.ts` |
| Configurator path constants | `src/app/features/configurator-manager/shared/constants/configurators.paths.ts` |

## Test Commands

Run these commands from the project root (`/Users/andrei.parcheuski/WebstormProjects/metabox`):

| Command | Purpose |
|---|---|
| `pnpm e2e` | Run all E2E tests |
| `pnpm e2e:ui` | Run tests in Playwright UI mode (interactive) |
| `pnpm e2e:debug` | Run tests in debug mode |
| `pnpm e2e:ui-debug` | Run tests in UI debug mode |
| `pnpm e2e:shard` | Run tests in shard mode (CI/CD) |
| `pnpm lint` | Run ESLint on all files |
| `pnpm test` | Run Vitest unit tests |

**IMPORTANT: Always run `pnpm e2e` after creating or modifying spec files** to verify they pass before marking the task complete. This is non-negotiable.

### Running e2e in a non-interactive shell (no TTY)

`pnpm e2e` (and `pnpm start:ssl`) can abort before any test runs with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` — pnpm's dep-check sees a modified `package.json`, tries an auto `pnpm install`, and aborts the modules purge because there's no TTY. Setting `npm_config_verify_deps_before_run=false` does **not** suppress it.

The e2e flow's `devServerTarget` is `metabox:serve:playwright`, which builds with `src/environments/environment.playwright.ts` (`playwright: true`). With the **default** environment (`playwright: false`) the app calls the REAL API (absolute URLs the GQL interceptor regex can't match), so pages redirect to the list view and nearly every render-based test fails — the tell-tale symptom is `getByTestId('left-sidebar')` (or the page container) "element(s) not found" on tests that previously passed.

Workaround — start the server directly via the binary (bypasses the pnpm dep check) WITH the playwright configuration, then run Playwright directly (`webServer.reuseExistingServer: true` reuses it):

```bash
# 1. start the playwright-config dev server in the background (~10s build)
NODE_OPTIONS=--max-old-space-size=8192 node_modules/.bin/ng serve --ssl --configuration=playwright

# 2. poll until ready
until [ "$(curl -k -s -o /dev/null -w '%{http_code}' https://localhost:4235/)" = "200" ]; do sleep 3; done

# 3. run specific specs (auth setup project runs automatically as a dependency)
npx playwright test e2e/features/<feature>/<feature>.spec.ts --project=chromium --reporter=line
```

Capture the full reporter output to a file (`> /tmp/run.log 2>&1`) — piping through `tail` truncates the per-test error details you need to diagnose failures.

---

## Workflow

Execute these phases sequentially. Do NOT skip phases.

### Phase 1: Feature Analysis

1. **Ask the user** which feature to test. Get the route path or component folder name.
2. **Determine the feature type** (this changes everything):
   - **Routable page**: has its own route in `app.routes.ts` → standard page object + spec
   - **Modal/dialog feature**: opened by another page via `Dialog.open()` → tests run on the host page; page object wraps host page's setup class
   - **Unreal-dependent feature**: main template wrapped in `@defer (when !!isInitApi())` where `isInitApi = !!api()` (the Unreal WebSocket API) → UI never renders in Playwright; only URL navigation and GQL error redirects can be tested
3. **Read the Angular source code** for that feature in `src/app/`:
   - Component templates (`.html`) -- understand what UI elements exist (tables, forms, buttons, dialogs, selectors)
   - Component TypeScript (`.ts`) -- understand what data is loaded, what signals/stores are used
   - Store files -- understand which GraphQL queries and mutations are called
   - Route config -- understand sub-routes (list, create, edit, detail)
4. **Verify store data flow (CRITICAL)**:
   - Open each store file used by the feature
   - Confirm the store actually makes **real GraphQL HTTP requests** (e.g. `productListGQL.fetch()`)
   - Check for hardcoded mock data (`aProduct()`, `aGetProductListOutput()` etc.) used directly in the store instead of GQL calls
   - Check for commented-out GQL calls -- if the real `fetch()` is commented out and replaced with hardcoded data, `gqlInterceptor.addMock()` will NEVER intercept anything because no HTTP request is made
   - If the store uses hardcoded data, **report this to the user** before proceeding -- mocking the GQL operation is pointless until the store is fixed
5. **Identify GraphQL operations used** by checking:
   - `graphql/default/operations.ts` for default operation names
   - `graphql/legacy/operations.ts` for legacy operation names
6. **Verify route hierarchy (CRITICAL)**:
   - Open `src/app/app.routes.ts` and check whether the feature route is **top-level** or **nested** under another route
   - The `goto()` path must match exactly how the route is registered in `app.routes.ts`
   - Example: if `app.routes.ts` has `{ path: PRODUCTS, ... }` at root level, use `page.goto(PRODUCTS)`
   - **Public routes** (no `canActivate` guard): stream routes like `metabox-configurator/basic/:id` have no auth guard. The default `storageState: ROLE_SUPER_ADMIN.json` still works.
7. **Identify available mock builders** in:
   - `graphql/default/generated-mocks.ts` (e.g. `aProduct()`, `aMaterial()`)
   - `graphql/legacy/generated-mocks.ts` (e.g. `aUser()`, `aMutation()`)
8. **Check what permissions** gate UI elements by reading the templates for permission directives/conditions.
9. **Check for conditional rendering guards**: Templates often conditionally render elements based on entity state (e.g. an entity ID being truthy for edit mode vs falsy for create mode). Create and edit pages may show different buttons/menus. Always verify which mode applies before writing visibility assertions.
10. **Document your findings** in a brief summary before proceeding.

### Phase 2: Scope Confirmation

Ask the user:
- **Which user roles** to test: `ROLE_SUPER_ADMIN`, `ROLE_COMPANY_ADMIN`, `ROLE_COMPANY_USER`, or multiple roles?
- **Which sub-features** to cover: list page, create flow, edit flow, detail page, delete flow?

If the user says "create e2e tests" without further qualification, **default to implementing P0 and P1 tests** for `ROLE_SUPER_ADMIN` unless the feature is inherently role-restricted.

### Phase 3: Create Feature Directory

Create the following file structure under `e2e/features/{feature-name}/`:

```
e2e/features/{feature-name}/
├── {feature-name}.ts                              # Page Object
├── {feature-name}.spec.ts                         # Main spec file
└── mocks/
    ├── {feature-name}-mocks.ts                    # Mock data layer
    └── setup-{feature-name}-mocks.ts              # Mock setup class
```

For features with create/edit sub-pages, use separate page objects and spec files:
```
e2e/features/{feature-name}/
├── {feature-name}-list.ts
├── {feature-name}-create.ts
├── {feature-name}-edit.ts
├── {feature-name}-list.spec.ts
├── {feature-name}-create.spec.ts
├── {feature-name}-edit.spec.ts
└── mocks/
    ├── {feature-name}-mocks.ts
    └── setup-{feature-name}-mocks.ts
```

**For modal/dialog features** (no own route): the page object navigates to the host page and wraps the host setup class. See the Modal/Dialog Feature Pattern section.

**For Unreal-dependent features** (main UI behind `@defer (when !!isInitApi())`): only create URL navigation and GQL error redirect tests. See the Unreal-Dependent Feature Pattern section.

### Phase 4: Create Mock Data Layer

File: `e2e/features/{feature-name}/mocks/{feature-name}-mocks.ts`

**Rules:**
- ALWAYS use codegen builders (`aProduct()`, `aClient()`, etc.) -- never construct objects manually
- Use meaningful, feature-prefixed IDs (e.g. `'bc-product-1'` for basic-configurator, `'mc-component-1'` for modular-configurator) to avoid collisions and maintain referential integrity
- Export a named object (e.g. `featureMocks`) with descriptive properties
- **NEVER modify existing shared mock defaults.** Codegen builders use `faker.seed(0)`, so adding/changing ANY field in an existing mock shifts the faker sequence and changes ALL subsequently auto-generated fields. This silently breaks every test that depends on those default values. Instead, create **new named variants** that leave the original untouched.
- **Cover conditional template branches with a dedicated falsy/empty variant.** Templates gate UI on data: `@if (entity.externalId)` (block shown vs hidden), `!!entity.showcase ? 'available' : 'not available'`, `entity.count > 0 ? 'yes' : 'no'`, and `reduce` computeds that fall back to their initial accumulator on empty arrays. A single "populated" mock only exercises the truthy side. Add a **new** `…EmptyMock` variant (null/empty/0 fields) plus a `setup…EmptyDetails()` method, and a separate `describe` block asserting the falsy outputs (hidden block via `toHaveCount(0)`, the "not available"/"no" text, `'0'`/`'1'` counts). Do NOT mutate the populated variant to do this.
- When adding new test scenarios, **add new exports** to the mocks file -- do not add fields to existing exports
- **For modal features re-using host page mocks**: re-export from the host rather than duplicating: `export { basicConfiguratorMocks as cameraStreamMocks } from '...'`

**JSON configuration fields**: Some GQL types have `configuration` fields that store JSON as a string. Always use `JSON.stringify()` when building these — never pass a plain object. The Angular component will parse the string; if the field is not valid JSON, conditional rendering that reads parsed config (e.g. `@if (isWeatherEnable())`) will silently not render.

```typescript
const lightingConfiguration = JSON.stringify({
  streamState: { weatherData: { sunData: { enable: true } } },
  sunOrientation: 45,
  timeOfDay: 12,
});

aRenderRequest({ configuration: lightingConfiguration });
```

**Pattern:**
```typescript
import { aProduct, aClient } from '@graphql/default/generated-mocks';

export const productsMocks = {
  productList: [
    aProduct({
      id: 'product-1',
      title: 'Product Alpha',
      // ... other overrides
    }),
    aProduct({
      id: 'product-2',
      title: 'Product Beta',
    }),
  ],
  emptyList: [],
  singleProduct: aProduct({
    id: 'product-1',
    title: 'Product Alpha',
  }),
  clientList: [
    aClient({ id: 'client-1', name: 'Test Client 1' }),
    aClient({ id: 'client-2', name: 'Test Client 2' }),
  ],
};
```

### Phase 5: Create Mock Setup Class

File: `e2e/features/{feature-name}/mocks/setup-{feature-name}-mocks.ts`

**Rules:**
- Class takes `GqlInterceptor` (and optionally `RestInterceptor`) in constructor
- Import operation names from `@graphql/default/operations` (use `namedOperations`) or `@graphql/legacy/operations` (use `legacyNamedOperations`)
- Each method is synchronous and calls `this.gqlInterceptor.addMock()` or `this.gqlInterceptor.addMocks()`
- Response shape must match the GraphQL query/mutation return type exactly
- For list queries, include pagination fields (`offset`, `limit`, `total`)
- For operations that need different responses on subsequent calls (e.g. infinite scroll), add multiple configs to the same operation
- **Always mock `GET /features`** via `restInterceptor` -- every page load needs this to not call the real server
- **For GQL error simulation**, use `statusCode: 500` with `res: { errors: [{ message: '...' }] }` -- triggers `tapResponse` error callback
- **For modal features**, compose by delegating to the host page's setup class rather than duplicating setup methods

**GQL interceptor regex limitation**: `regexInterceptGql = /\/(graphql\/|v2\/graphql)/` only intercepts **relative-path** GQL requests. External URLs (e.g. `https://ecom-api.3dsource.com/graphql`) are **not intercepted** -- their failures show as toasts and do not redirect.

**Pattern:**
```typescript
import type { GqlInterceptor } from '@e2e/interfaces/intercept-gql.interface';
import type { RestInterceptor } from '@e2e/helpers/intercept-rest';
import { namedOperations } from '@graphql/default/operations';
import { productsMocks } from './products-mocks';
import { aGetProductListOutput } from '@graphql/default/generated-mocks';
import { DEFAULT_LIST_ITEMS_COUNT } from '@shared/constants/common.constants';

export class SetupProductsMocks {
  constructor(
    private gqlInterceptor: GqlInterceptor,
    private restInterceptor: RestInterceptor,
  ) {}

  setupFeaturesFlags() {
    this.restInterceptor.addMock({
      method: 'GET',
      path: '/features',
      response: { application: 'Metabox' },
    });
  }

  setupDefaultProductList() {
    this.gqlInterceptor.addMock({
      operationName: namedOperations.Query.productList,
      res: {
        data: {
          [namedOperations.Query.productList]: aGetProductListOutput({
            products: productsMocks.productList,
            offset: 0,
            limit: DEFAULT_LIST_ITEMS_COUNT,
            total: productsMocks.productList.length,
          }),
        },
      },
    });
  }

  // Simulate GQL error → triggers tapResponse error callback → redirect or toast
  setupProductListError() {
    this.gqlInterceptor.addMock({
      operationName: namedOperations.Query.productList,
      statusCode: 500,
      res: { errors: [{ message: 'Internal server error' }] },
    });
  }

  // Infinite scroll: register first page, then second page response
  setupScrollableList() {
    this.setupDefaultProductList(); // first call
    this.gqlInterceptor.addMock({   // second call (after scroll)
      operationName: namedOperations.Query.productList,
      res: {
        data: {
          [namedOperations.Query.productList]: aGetProductListOutput({
            products: productsMocks.productList,
            offset: DEFAULT_LIST_ITEMS_COUNT,
            limit: DEFAULT_LIST_ITEMS_COUNT,
            total: DEFAULT_LIST_ITEMS_COUNT * 2,
          }),
        },
      },
    });
  }
}
```

### Phase 6: Create Page Object

File: `e2e/features/{feature-name}/{feature-name}.ts`

**Rules:**
- ALL selectors use `page.getByTestId('...')` -- never CSS selectors or XPath
- For Material components inside test-id containers, chain: `page.getByTestId('x').getByRole('checkbox')`
- For Material dropdowns (mat-option), use: `page.locator('mat-option').filter({ hasText: '...' })`
- `page` is `readonly` public (specs need `featurePage.page.waitForURL()`)
- `gqlInterceptor` and `restInterceptor` are passed in constructor, saved as private properties, then wrapped by `initMocks()`
- `interceptGql` and `interceptRest` are nullable, initialized via `async initMocks()`
- `mockSetup!` -- non-null assertion, initialized lazily via `async initMocks()`
- Group locators by section with clear comments
- Mock delegation methods are synchronous (no `async`)
- Verification methods include `expect()` assertions
- Encapsulate complex multistep interactions (datepicker selection, autocomplete, dialog confirmation) in dedicated helper methods

#### Clicking `src-button` and `src-icon-button`

Source-ui-native components (`src-button`, `src-icon-button`) use `.click()` directly on the `getByTestId()` result -- no need to chain `.locator('button')`:

```typescript
// Correct: plain .click() for source-ui-native components
async clickAddProduct() {
  await this.addProductButton.click();
}

// Correct: same for src-icon-button
async clickSettings() {
  await this.settingsButton.click();
}
```

Do NOT chain `.locator('button').click()` -- this is unnecessary and incorrect for `src-button` / `src-icon-button`.

**Pattern:**
```typescript
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { PRODUCTS } from '@shared/constants/routing-paths.constants';
import type { interceptGQL as baseInterceptGQL } from '@e2e/helpers/intercept-gql';
import type { interceptREST as baseInterceptREST, RestInterceptor } from '@e2e/helpers/intercept-rest';
import type { GqlInterceptor } from '@e2e/interfaces/intercept-gql.interface';
import { SetupProductsMocks } from './mocks/setup-products-mocks';

export class Products {
  private mockSetup!: SetupProductsMocks;
  private interceptGql: GqlInterceptor | null = null;
  private interceptRest: RestInterceptor | null = null;

  // Page elements
  readonly loading: Locator;

  // Table elements
  readonly cardsContainer: Locator;
  readonly cards: Locator;
  readonly emptyList: Locator;

  // Action elements
  readonly searchInput: Locator;
  readonly addButton: Locator;

  constructor(
    readonly page: Page,
    readonly gqlInterceptor: typeof baseInterceptGQL,
    readonly restInterceptor: typeof baseInterceptREST,
  ) {
    this.loading = page.locator('src-loading');
    this.cardsContainer = page.getByTestId('product-cards');
    this.cards = this.cardsContainer.locator('app-card');
    this.emptyList = page.locator('app-empty-list-entity');
    this.searchInput = page.getByTestId('search-product').getByRole('textbox');
    this.addButton = page.getByTestId('add-product');
  }

  async initMocks() {
    this.interceptGql = await this.gqlInterceptor(this.page);
    this.interceptRest = await this.restInterceptor(this.page);
    this.mockSetup = new SetupProductsMocks(this.interceptGql, this.interceptRest);
  }

  async goto() {
    await this.page.goto(PRODUCTS);
    await this.page.waitForURL(PRODUCTS);
  }

  // Mock setup delegation (synchronous)
  setupFeaturesFlags() { this.mockSetup.setupFeaturesFlags(); }
  setupDefaultList() { this.mockSetup.setupDefaultProductList(); }
  setupEmptyList() { this.mockSetup.setupEmptyProductList(); }

  // Interactions
  async clickAdd() {
    await this.addButton.click();
  }

  // Verification
  async checkLoading() {
    try {
      await expect(this.loading).toBeVisible();
      await expect(this.loading).toBeHidden();
    } catch {
      console.info('Loading was too fast to catch or not present');
    }
  }

  async getCardsCount(): Promise<number> {
    return await this.cards.count();
  }
}
```

### Phase 7: Verify Test-IDs (MANDATORY)

**This phase is non-negotiable. Do NOT skip it.**

For EVERY `page.getByTestId('xxx')` locator used in the Page Object:

1. Search the Angular component templates in `src/` for `data-testid="xxx"` (or `[data-testid]="'xxx'"` or `[attr.data-testid]="'xxx'"`)
2. If the test-id EXISTS -- mark as verified, proceed
3. If the test-id is MISSING:
   - Report to the user: exact file path, element description, proposed `data-testid` value
   - If the user asked to "create e2e tests" without restriction, **proceed with adding the test-id** after reporting it
   - Apply the correct binding type (see below)
4. **Never write spec files that reference unverified test-ids** -- they will fail silently with confusing timeouts

#### `@3dsource/source-ui-native` Components (src-button, src-icon-button, src-banner, etc.)

These web components have a `testID` input with `publicName: "data-testid"`. This means:

- **Use `[data-testid]="'my-id'"` (property binding)** -- this passes the value to the component's `testID` input, which renders `data-testid` on the **inner** native element
- **NEVER use `[attr.data-testid]="'my-id'"` (attribute binding)** -- this only sets the attribute on the **host** element, NOT on the inner element. This causes clicks to miss the inner `<button>` and may create duplicate `data-testid` on both host and inner element (strict mode violations)
- **For non-source-ui components** (plain `<div>`, `<li>`, `<form>`, `<span>`, etc.), use `data-testid="my-id"` (static) or `[attr.data-testid]="'my-id'"` (dynamic) -- both are correct for plain HTML elements

#### `toHaveClass` for Checking Pressed/Active State

`src-button` adds `src-button--pressed` class to the inner `<button>`, but the button always has multiple classes (e.g. `"src-button src-button--filled src-button--secondary src-button--pressed"`).

- **Use regex**: `await expect(locator).toHaveClass(/src-button--pressed/)`
- **NEVER use exact string**: `toHaveClass('src-button--pressed')` fails because it does an exact match against the full class string

### Phase 8: Register Page Object in Fixtures

Update `e2e/features/index.ts`:

1. **Add import** at the top (group with related features):
   ```typescript
   import { FeatureName } from '@e2e/features/{feature-name}/{feature-name}';
   ```

2. **Add to `Index` interface**:
   ```typescript
   featureNamePage: FeatureName;
   ```

3. **Add fixture initialization** in the `test.extend<Index>()` object:
   ```typescript
   featureNamePage: async ({ page, interceptGQL, interceptREST }, use) =>
     use(new FeatureName(page, interceptGQL, interceptREST)),
   ```

### Phase 9: Present Priority-Ranked Test List

Before writing any spec, present the user with a **ranked test list**. Group by priority tier:

#### P0 -- Critical (breaks the feature if failing)
- Page loads and shows the correct data (table/list with expected rows)
- Primary CRUD operations succeed (create saves, edit updates, delete removes)
- Permission-gated elements: visible for `ROLE_SUPER_ADMIN`, hidden for `ROLE_COMPANY_USER`
- Navigation works: list → detail → back, list → create → submit → redirect

#### P1 -- Important (catches real regressions)
- Form validation: required fields show errors on empty submit
- Empty state: correct message when no data exists
- Loading state: spinner appears during data fetch
- Edit mode: form pre-fills with existing entity data
- GQL error handling: API error (500) shows error UI or redirects, not blank page

#### P2 -- Standard (solid coverage)
- Pagination / infinite scroll: scrolling loads more items, counter updates
- Search/filtering: input filters list, clearing restores full list
- Confirmation dialogs: appear before destructive actions (delete)
- Counter/badge values: match actual data count
- Success feedback: toast after create/update/delete

#### P3 -- Nice to have (polish)
- Keyboard navigation and focus management
- Edge cases: very long names, special characters, boundary values
- Secondary UI: tooltips, copy-to-clipboard, disabled state styling
- URL state: query params reflect current filters/page

**If the user says "create e2e tests" without specifying priority**, implement P0 and P1 by default. Present the full list but proceed without waiting for confirmation.

### Test Consolidation Strategy

**Prefer fewer, combined tests over many granular tests.** Combine related assertions into comprehensive test flows that verify multiple aspects of a single user action.

#### When to Consolidate

Consolidate tests when they:
1. **Share identical setup** - Same navigation, same form filling, same state
2. **Test related UI interactions** - Dropdown display + selection + options listing
3. **Verify sequential user flow** - Fill form → validate → submit → verify success
4. **Check multiple aspects of one feature** - Modal open + content display + close

#### Consolidation Patterns

```typescript
// ❌ BAD: 4 separate tests with duplicate setup
test('should display country dropdown', async ({ accountPage }) => {
  await expect.soft(accountPage.countrySelect).toBeVisible();
});

test('should list all countries', async ({ accountPage }) => {
  await accountPage.countrySelect.click();
  await expect.soft(options).toHaveCount(10);
});

test('should select country', async ({ accountPage }) => {
  await accountPage.selectCountry('UK');
  await expect.soft(accountPage.countrySelect).toContainText('UK');
});

test('should close on escape', async ({ accountPage }) => {
  await accountPage.countrySelect.click();
  await page.keyboard.press('Escape');
  await expect.soft(options.first()).not.toBeVisible();
});

// ✅ GOOD: 1 comprehensive test
test('should display and interact with country dropdown (select, list options, escape to close)', async ({
  accountPage,
}) => {
  // Verify dropdown is visible
  await expect.soft(accountPage.countrySelect).toBeVisible();

  // Open and verify all options listed
  await accountPage.countrySelect.click();
  const options = page.locator('mat-option');
  await expect.soft(options).toHaveCount(10);

  // Close with Escape
  await page.keyboard.press('Escape');
  await expect.soft(options.first()).not.toBeVisible();

  // Select a country
  await accountPage.selectCountry('UK');
  await expect.soft(accountPage.countrySelect).toContainText('UK');
});
```

#### What NOT to Consolidate

Keep tests **separate** when they:
1. **Test different error paths** - Each error scenario needs isolation
2. **Have different prerequisites** - Different roles, different data states
3. **Test mutually exclusive states** - Empty list vs populated list
4. **Verify independent features** - Search and pagination are separate concerns

### Edge Case and Negative Testing (MANDATORY)

**Every feature MUST include edge case and negative testing.** These catch the majority of production bugs.

#### Security Edge Cases (Always Test)

```typescript
test.describe('Security - Edge Cases', () => {
  test('should sanitize XSS attempt in input field', async ({ page }) => {
    const xssAttempt = '<script>alert("xss")</script>';
    await page.fillInput(xssAttempt);
    await page.submit();
    
    await page.expectSuccessToast();
    const displayedValue = await page.getDisplayedValue();
    expect.soft(displayedValue).not.toContain('<script>');
  });

  test('should handle SQL injection attempt gracefully', async ({ page }) => {
    await page.fillEmail("admin'--@test.com");
    await page.fillPassword('password');
    await page.clickLogin();
    
    // Should fail authentication, not execute SQL
    await page.expectErrorToast();
  });
});
```

#### Boundary Value Testing (Always Test)

```typescript
test.describe('Boundary Values - Edge Cases', () => {
  test('should handle maximum length input (255 chars)', async ({ page }) => {
    const maxName = 'A'.repeat(255);
    await page.fillName(maxName);
    await page.submit();
    
    await page.expectSuccessToast();
  });

  test('should reject input exceeding max length (256 chars)', async ({ page }) => {
    const tooLong = 'A'.repeat(256);
    await page.fillName(tooLong);
    
    const saveButton = page.getByTestId('save');
    await expect.soft(saveButton).toBeDisabled();
  });

  test('should reject empty required field', async ({ page }) => {
    await page.fillName('');
    await page.submit();
    
    await expect.soft(page.getByText('Name is required')).toBeVisible();
  });

  test('should reject whitespace-only input', async ({ page }) => {
    await page.fillName('   ');
    
    const saveButton = page.getByTestId('save');
    await expect.soft(saveButton).toBeDisabled();
  });
});
```

#### Special Characters & Unicode (Always Test)

```typescript
test.describe('Special Characters - Edge Cases', () => {
  test('should handle special characters in name', async ({ page }) => {
    const specialName = "O'Brien-Smith @#$%";
    await page.fillName(specialName);
    await page.submit();
    
    await page.expectSuccessToast();
    await expect.soft(page.getDisplayedName()).toHaveText(specialName);
  });

  test('should handle unicode characters (emoji, CJK, Cyrillic)', async ({ page }) => {
    const unicodeName = '材料名称 🎨 Матеріал';
    await page.fillName(unicodeName);
    await page.submit();
    
    await page.expectSuccessToast();
    await expect.soft(page.getDisplayedName()).toHaveText(unicodeName);
  });
});
```

#### Concurrent Operations & Race Conditions (Always Test)

```typescript
test.describe('Concurrent Operations - Edge Cases', () => {
  test('should handle rapid multiple clicks gracefully', async ({ page }) => {
    // Rapid clicks should only trigger one request
    const button = page.getByTestId('submit');
    await button.click();
    await button.click();
    await button.click();
    
    // Should show success toast only once
    await page.expectSuccessToast();
  });

  test('should handle rapid form field changes', async ({ page }) => {
    await page.fillName('First Value');
    await page.fillName('Second Value');
    await page.fillName('Final Value');
    await page.submit();
    
    // Should save the final value
    await page.expectSuccessToast();
    await expect.soft(page.getDisplayedName()).toHaveText('Final Value');
  });
});
```

#### Network & State Edge Cases (Always Test)

```typescript
test.describe('Error Handling - Edge Cases', () => {
  test('should show error toast when API returns 500', async ({ page }) => {
    page.setupApiError();
    await page.goto();
    
    await page.expectErrorToast();
  });

  test('should redirect when resource not found', async ({ page }) => {
    page.setupNotFoundError();
    await page.page.goto('/resource/invalid-id');
    
    await page.page.waitForURL('**/resources');
    await expect.soft(page.page).toHaveURL(/resources/);
  });

  test('should handle malformed UUID gracefully', async ({ page }) => {
    page.setupNotFoundError();
    await page.page.goto('/resource/not-a-uuid');
    
    await page.expectErrorToast();
    await page.page.waitForURL('**/resources');
  });

  test('should handle empty ID parameter', async ({ page }) => {
    page.setupNotFoundError();
    await page.page.goto('/resource/');
    
    await page.page.waitForURL('**/resources');
  });
});
```

#### Empty State & Missing Data (Always Test)

```typescript
test.describe('Empty State - Edge Cases', () => {
  test('should display empty state when no data exists', async ({ page }) => {
    page.setupEmptyList();
    await page.goto();
    
    await expect.soft(page.emptyState).toBeVisible();
    await expect.soft(page.getByTestId('card')).toHaveCount(0);
  });

  test('should handle missing thumbnails gracefully', async ({ page }) => {
    page.setupWithMissingThumbnails();
    await page.goto();
    
    // Cards should still be visible even without thumbnails
    const cards = page.getByTestId('card');
    await expect.soft(cards.first()).toBeVisible();
  });
});
```

### Edge Case Checklist

Before marking tests complete, verify you've tested:

- [ ] **Security**: XSS attempts, SQL injection, script tags in inputs
- [ ] **Boundaries**: Max length (255), min length (0), whitespace-only
- [ ] **Special chars**: `@#$%^&*()_+-=[]{}|;':,.<>?/`, quotes, apostrophes
- [ ] **Unicode**: Emoji (🎨), CJK (材料), Cyrillic (Матеріал), RTL languages
- [ ] **Concurrent ops**: Rapid clicks, rapid form changes, race conditions
- [ ] **Network errors**: 500 errors, 404 not found, timeout scenarios
- [ ] **Invalid IDs**: Malformed UUIDs, empty IDs, special chars in IDs
- [ ] **Empty states**: Zero results, missing data, null values
- [ ] **Form validation**: Required fields, format validation, mismatch validation
- [ ] **Permissions**: Hidden elements for restricted roles



### Phase 10: Write Spec Files

**Apply the Test Consolidation Strategy and Edge Case Checklist from Phase 9** when writing specs.

#### Extending Existing Spec Files

When adding tests to an **existing** spec file:
- **Read the whole spec file first** before writing anything — find all existing `describe` blocks
- **Do NOT create a duplicate `describe` block** with the same name as an existing one — add tests inside the existing block instead
- **Run lint** after editing to catch any reformatting the linter applies

#### Readability Rules (NON-NEGOTIABLE)

1. **Extract repeated setup into `beforeEach`**: if 2+ tests share the same pre-condition (navigate to create page, fill a form, select a client), that setup MUST go into a `beforeEach` of a nested `describe` block. NEVER copy-paste the same 3+ lines into multiple tests. This includes **shared first-step interactions** — if every test in a describe block starts with `await page.clickDiscard()` or `await page.openMenu()`, move that call into the `beforeEach` too.

2. **Use nested `describe` blocks** to create meaningful setup scopes:
   ```typescript
   describe('Feature Name') {
     beforeEach -> initMocks, clientSetup

     describe('List view') {
       beforeEach -> setupFeaturesFlags, setupDefaultList, goto

       describe('With data') {
         test: 'should display table with N rows'
         test: 'should show search input'

       describe('Empty state') {
         beforeEach -> setupEmptyList (instead of default)
         test: 'should show empty state message'

     describe('Create') {
       beforeEach -> setupCreateMock, goto (create URL)
       test: 'should display the create form'
       test: 'should redirect after successful creation'

       describe('Form validation') {
         beforeEach -> click submit without filling
         test: 'should show required error for title'
   ```

3. **One logical scenario per test**: each test verifies ONE user-observable outcome. A test can contain multiple `expect.soft()` assertions if they all verify the same thing (e.g. all fields on a page, all items in a modal). What it must NOT do is test two independent outcomes that could fail for unrelated reasons.
   - GOOD: `'should display all product settings menu options'` — 5 assertions, same scenario
   - GOOD: `'should display 14 rows in the configurators table'`
   - BAD: `'table rows'`
   - BAD: `'click button, fill form, submit, check redirect, verify toast'` — two independent outcomes

4. **Test names must read as sentences**: always start with `'should ...'`.

5. **No inline magic values**: use constants, mock data references, or clearly named variables.

6. **Keep tests flat**: action(s) + assertion(s). No deeply nested `if/else` or loops.

7. **Prefer page object methods** for all interactions and assertions. Specs should read like scenario scripts.

#### Import Pattern

```typescript
import { expect, test } from '@e2e/features';
import { featureMocks } from '@e2e/features/feature-name/mocks/feature-mocks';
import { FEATURE_PATH } from '@shared/constants/routing-paths.constants';
```

#### Standard `beforeEach` Pattern (Super Admin)

```typescript
test.describe('Feature Name', () => {
  test.use({ storageState: 'e2e/.auth/ROLE_SUPER_ADMIN.json' });

  test.beforeEach(async ({ featurePage }) => {
    await featurePage.initMocks();           // 1. Init interceptors + mock setup class
    featurePage.setupClientList();           // 2. Setup client list (if needed)
    featurePage.setupClient({ hasPublicAssets: true }); // 3. Setup current client
  });

  test.describe('List view', () => {
    test.beforeEach(async ({ featurePage }) => {
      featurePage.setupFeaturesFlags();     // 4. Setup feature flags
      featurePage.setupDefaultList();       // 5. Setup feature-specific mocks
      await featurePage.goto();             // 6. Navigate
    });

    test('should display items', async ({ featurePage }) => {
      // ...
    });
  });
});
```

#### Complete Spec Example

```typescript
import { expect, test } from '@e2e/features';
import { featureMocks } from '@e2e/features/{feature-name}/mocks/{feature-name}-mocks';

test.describe('Feature List', () => {
  test.use({ storageState: 'e2e/.auth/ROLE_SUPER_ADMIN.json' });

  test.beforeEach(async ({ featurePage }) => {
    await featurePage.initMocks();
    featurePage.setupClientList();
    featurePage.setupClient({ hasPublicAssets: true });
  });

  test.describe('List Display', () => {
    test.beforeEach(async ({ featurePage }) => {
      featurePage.setupFeaturesFlags();
      featurePage.setupDefaultList();
      await featurePage.goto();
      await featurePage.checkIfAvailableContent();
    });

    test('should display table with search input and expected row count', async ({
      featurePage,
    }) => {
      await expect.soft(featurePage.searchInput).toBeVisible();
      expect
        .soft(await featurePage.getRowsCount())
        .toBe(featurePage.expectedItemCount);
    });
  });

  test.describe('Empty State', () => {
    test.beforeEach(async ({ featurePage }) => {
      featurePage.setupFeaturesFlags();
      featurePage.setupEmptyList();
      await featurePage.goto();
    });

    test('should display empty state when no items exist', async ({
      featurePage,
    }) => {
      await expect.soft(featurePage.emptyState).toBeVisible();
    });
  });
});
```

### Phase 11: Run Tests and Linter (MANDATORY)

**This phase is non-negotiable. Always run tests before considering work complete.**

After creating/modifying spec files:

1. **Run E2E tests** to verify they pass:
   ```bash
   pnpm e2e
   ```

2. **Run linter** to catch TypeScript and style issues:
   ```bash
   pnpm lint --quiet
   ```

3. **Fix all errors** before proceeding

**If tests fail:**
- Check mock setup - verify all GQL operations are mocked
- Check test-ids - ensure they exist in templates
- Check assertions - verify expected values match mock data
- Check timing - ensure async operations complete before assertions
- **Report unexpected failures as potential bugs** - don't adjust tests to hide app issues

The linter may auto-reformat multi-line chains into single-line format -- this is expected and intentional.

### Phase 12: Final Verification

After all files are created:

1. **Run E2E tests** - `pnpm e2e` - all tests must pass
2. **Run linter** - `pnpm lint` - no errors allowed
3. **Check for TypeScript errors** in all created/modified files
4. **Verify file naming** matches Playwright project patterns: `**/*.spec.ts`
5. **Verify imports** resolve correctly (path aliases like `@e2e/`, `@graphql/`, `@shared/`)
6. **Confirm Page Object** is registered in `e2e/features/index.ts`
7. **Confirm all test-ids** are present in Angular templates
8. **Verify edge cases** - check Edge Case Checklist is complete
9. **Verify test consolidation** - no unnecessary duplicate tests

**DO NOT mark task complete until all E2E tests pass.** This is mandatory.

---

## Special Feature Patterns

### Unreal-Dependent Features

**When to apply**: Feature's main template is gated behind `@defer (when !!isInitApi())` where `isInitApi = computed(() => !!store.api())` and `api()` is the Unreal WebSocket communicator — it never initializes in a browser-only Playwright test.

**What is testable**:
- URL navigation: page loads at the correct route
- GQL error redirect: when the configurator GQL fails (status 500), the store calls `router.navigate([CONFIGURATOR_NOT_FOUND])` → redirect is testable

**What is NOT testable** without Unreal:
- Any UI element inside the `@defer` block (sidebar, controls, product list, etc.)
- Camera controls (`viewportReady = false`)

**Pattern for test files:**
```typescript
// Only 2 tests: URL and error redirect
test.describe('Basic Configurator Stream', () => {
  test.beforeEach(async ({ basicConfiguratorStreamPage }) => {
    await basicConfiguratorStreamPage.initMocks();
    basicConfiguratorStreamPage.setupFeaturesFlags();
  });

  test.describe('Page Navigation', () => {
    test.beforeEach(async ({ basicConfiguratorStreamPage }) => {
      basicConfiguratorStreamPage.setupConfigurator();
      await basicConfiguratorStreamPage.goto(configuratorId);
    });

    test('should navigate to the correct URL', async ({ basicConfiguratorStreamPage }) => {
      await expect.soft(basicConfiguratorStreamPage.page).toHaveURL(
        new RegExp(`metabox-configurator/basic/${configuratorId}`),
      );
    });
  });

  test.describe('Error Handling', () => {
    test('should redirect to configurator-not-found when GQL returns an error', async ({
      basicConfiguratorStreamPage,
    }) => {
      basicConfiguratorStreamPage.setupConfiguratorError();
      await basicConfiguratorStreamPage.goto(configuratorId);
      await basicConfiguratorStreamPage.waitForNotFoundRedirect();
      await expect.soft(basicConfiguratorStreamPage.page)
        .toHaveURL(new RegExp('configurator-not-found'));
    });
  });
});
```

**Setup class for error case:**
```typescript
setupConfiguratorError() {
  this.gqlInterceptor.addMock({
    operationName: namedOperations.Query.basicConfigurator,
    statusCode: 500,
    res: { errors: [{ message: 'Internal server error' }] },
  });
}
```

**`waitForNotFoundRedirect` method:**
```typescript
async waitForNotFoundRedirect() {
  await this.page.waitForURL(`**/${CONFIGURATOR_NOT_FOUND}`);
}
```

### Modal/Dialog Feature Pattern

**When to apply**: Feature is a full-screen dialog opened by another page via `Dialog.open()` (e.g. `CameraLayout` opened by `CameraSettingsTrigger` from the basic-configurator-edit page).

**Key decisions**:
1. Tests navigate to the HOST page (e.g. basic-configurator-edit), not a dedicated route
2. The page object wraps the HOST page's mock setup class
3. Mock data can be re-exported from the host page rather than duplicated
4. The `goto(id)` method navigates to the host page

**Mock data re-export (avoids duplication):**
```typescript
// e2e/features/camera-stream/mocks/camera-stream-mocks.ts
export { basicConfiguratorMocks as cameraStreamMocks } from '@e2e/features/basic-configurator-manager/mocks/basic-configurator-mocks';
```

**Mock setup class composition (wraps host setup class):**
```typescript
// e2e/features/camera-stream/mocks/setup-camera-stream-mocks.ts
export class SetupCameraStreamMocks {
  private basicMocks: SetupBasicConfiguratorMocks;

  constructor(gqlInterceptor: GqlInterceptor, restInterceptor: RestInterceptor) {
    this.basicMocks = new SetupBasicConfiguratorMocks(gqlInterceptor, restInterceptor);
  }

  setupFeaturesFlags() { this.basicMocks.setupFeaturesFlags(); }
  setupClientList() { this.basicMocks.setupClientList(); }
  setupClient(options?: Partial<Client>) { this.basicMocks.setupClient(options); }
  setupConfigurator(options?: Partial<BasicConfigurator>) { this.basicMocks.setupConfigurator(options); }
}
```

**Page object navigates to host page:**
```typescript
async goto(configuratorId: string) {
  const url = `${CONFIGURATORS}/${BASIC_CONFIGURATOR_PATH}/${EDIT_CONFIGURATOR_PATH}/${configuratorId}`;
  await this.page.goto(url);
  await this.page.waitForURL(`**/${url}`);
}
```

### Shared Layout / Presentational Component Pattern

**When to apply**: A reusable presentational component in `src/app/shared/components/` (e.g. the sideshell layout) with no route of its own — it's projected into a real feature page via content projection. It has no GraphQL of its own and is only meaningful inside its host.

**Key decisions** (same composition idea as the Modal/Dialog pattern):
1. Tests navigate to the HOST page that renders it (find the host with `grep -rl "<app-the-component" src`). The sideshell's only host is the studio page, so its page object navigates to a studio product URL.
2. The page object composes the host's mock setup class and re-exports the host mocks.
3. **The shared component usually has no `data-testid`s** — add them (Phase 7 rules: `[data-testid]` for source-ui-native, `[attr.data-testid]`/static for plain elements) for the containers and controls you assert on.
4. **Observe a host-exposed computed through its host-side DOM effect.** A value exposed only via a template reference (e.g. `shell.primaryCollapsed()`) has no DOM of its own in the shared component — assert its effect in the HOST template (e.g. a menu label `<span>` rendered under `@if (!shell.primaryCollapsed())` appears/disappears).

**localStorage-backed state**: seed it before the app boots with `page.addInitScript(...)` so the on-init read picks it up, and read it back with `page.evaluate(() => localStorage.getItem(key))`. `addInitScript` re-runs on reload — don't seed in a test that then asserts post-reload persistence.

**Observing a non-visual side effect** (e.g. a `dispatchResize()` that emits a window `resize` event): install a counter before the action and assert it incremented — and assert it stayed `0` to prove an early-return guard did NOT fire.
```typescript
async installResizeCounter() {
  await this.page.evaluate(() => {
    const w = window as unknown as { __resizeCount: number };
    w.__resizeCount = 0;
    window.addEventListener('resize', () => (w.__resizeCount += 1));
  });
}
```

### Browser API Testing Patterns

Use these patterns when tests need to verify browser-level interactions rather than pure DOM state.

#### GQL Error Redirects — Use `page.goto()` directly

The page object's `goto()` method always includes `expect.soft(this.container).toBeVisible()`. For error redirect tests, this assertion never resolves because the page redirects before the container renders. Use `page.goto()` directly:

```typescript
// WRONG — page object goto() expects container to be visible
test('should redirect on error', async ({ renderPage }) => {
  renderPage.setupRenderError();
  await renderPage.goto(renderMocks.render.id); // hangs — container never appears
});

// CORRECT — bypass the container assertion
test('should redirect on error', async ({ renderPage }) => {
  renderPage.setupRenderError();
  await renderPage.page.goto(`render/${renderMocks.render.id}`); // direct navigation
  await renderPage.page.waitForURL('**/renders');
  await expect.soft(renderPage.page).toHaveURL(/\/renders/);
});
```

#### Popup / New Tab — `page.waitForEvent('popup')`

When a component calls `window.open(url, '_blank')`, capture the popup with `waitForEvent`:

```typescript
test('should open in a new tab', async ({ renderPage }) => {
  const popupPromise = renderPage.page.waitForEvent('popup');
  await renderPage.clickOpenInNewTab();
  const popup = await popupPromise;

  expect.soft(popup.url()).toContain(renderMocks.render.filePath);
});
```

#### File Download — `page.waitForRequest()` + `page.route()`

When a component downloads via `httpClient.get(url, { responseType: 'blob' })` and then creates a programmatic `<a>` click, Playwright's `download` event is NOT triggered. Instead, intercept the HTTP request:

```typescript
test('should request file for download', async ({ renderPage }) => {
  const filePath = renderMocks.render.filePath;

  // Intercept to prevent actual network call
  await renderPage.page.route(`**/${filePath}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from('fake-image-data'),
    }),
  );

  const requestPromise = renderPage.page.waitForRequest((request) =>
    request.url().includes(filePath),
  );
  await renderPage.clickDownload();
  await requestPromise;
});
```

#### Hover / mouseleave on absolutely-positioned overlays

Two hover gotchas, both seen with the sideshell's hover-mode primary panel:

1. **`locator.hover()` on a sibling can land on an overlay.** When an element is `position: absolute` and overlaps its siblings (e.g. a panel that expands on hover and covers the area next to it), hovering the sibling's center lands on the overlay instead — Playwright reports `<div …> subtree intercepts pointer events` and the intended `mouseleave` never fires. To deterministically leave such an element, move the pointer to a coordinate clearly outside it rather than hovering a sibling:
   ```typescript
   async moveMouseOffPrimary() {
     await this.page.mouse.move(1200, 300); // far right of the 1280px viewport, off the panel
   }
   ```

2. **Mouse position carries across steps and across tests.** A test that asserts an "unhovered" baseline can pass in isolation but fail in the suite, because a prior action (clicking a menu/popover in that region) left the pointer hovering the element — so the hover-driven signal is already true. Before asserting the unhovered state, explicitly move the pointer away. Don't rely on the pointer starting in a neutral spot.

#### Bounding Box — Always Assert Non-Null

`element.boundingBox()` returns `null` when the element is not in the layout (hidden, zero dimensions). If a test uses the result for coordinate math, the `null` case silently skips assertions and the test passes vacuously.

```typescript
// WRONG — test passes with zero assertions when box is null
const box = await button.boundingBox();
if (box) {
  expect.soft(box.x).toBeGreaterThan(0);
}

// CORRECT — assert non-null first, then use the value
const box = await button.boundingBox();
expect(box).not.toBeNull();
expect.soft(box!.x).toBeGreaterThan(0);
```

#### `expect.soft` vs `expect` (When to Use Each)

- **`expect.soft()`** — use for all content/state assertions inside tests. Failures are collected and reported at the end; the test continues running.
- **`expect()`** (hard) — use for precondition checks that must pass before the test can meaningfully continue, e.g. waiting for a dialog to be open before interacting with buttons inside it, or asserting a count before doing a conditional operation.

```typescript
// Hard expect: dialog must be open before we can click inside
await expect(page.discardChangesDialog).toBeVisible();

// Soft expects: content assertions that don't gate further steps
await expect.soft(page.discardChangesDialog).toContainText('Are you sure?');
await expect.soft(page.discardChangesDialog.locator('.src-modal__title')).toContainText('Discard changes?');
```

#### Dialog Buttons Without Test-IDs (`getByRole`)

When a dialog is rendered dynamically via `dialog.service.ts` (Angular CDK), the action buttons often don't have `data-testid` attributes. Use `getByRole('button', { name: '...' })` chained from the dialog container:

```typescript
// Acceptable: dialog buttons from CDK service don't have test-ids
await dialog.getByRole('button', { name: 'Cancel' }).click();
await dialog.getByRole('button', { name: 'Delete' }).click();
```

Do NOT add this pattern for buttons that do have (or could have) `data-testid` attributes.

#### `waitForTimeout` — Justification Required

Every `waitForTimeout` call must have a comment explaining WHY the delay is needed. Acceptable reasons:

```typescript
// Wait for the debounce (300 ms) on the search input to fire before asserting results
await page.waitForTimeout(400);

// Wait for the CSS transition animation (250 ms) to complete before measuring position
await page.waitForTimeout(300);

// Wait for the scene tile list to update after the effect re-runs on state change
await page.waitForTimeout(500);
```

If there's no clear reason, replace with a proper event-driven wait instead:
```typescript
// Replace timing guesses with explicit waits
await expect(page.loadingSpinner).toBeHidden();   // wait for loading to finish
await expect(page.results).toHaveCount(5);        // wait for data to appear
```

#### Toast Notifications

Toast elements use `#toast-container` as the container. Use class modifiers for success/error:

```typescript
// Success toast
const toast = renderPage.page.locator('#toast-container .toast-success');
await expect.soft(toast).toBeVisible();
await expect.soft(toast).toContainText('Image url was successfully copied to clipboard');

// Error toast
const errorToast = page.locator('#toast-container .toast-error');
```

#### CDK Dialog Assertions

`Dialog.open()` (Angular CDK) renders the dialog into the overlay container, which is part of the page's DOM tree. `page.getByTestId()` finds test-ids inside dialogs without any special handling:

```typescript
// Dialog container — CDK overlay is in the DOM, no special locator needed
this.entityCard = page.getByTestId('entity-card');

// In tests:
await expect.soft(renderPage.entityCard).toBeVisible();
await expect.soft(renderPage.entityCard).toContainText(renderMocks.environment.title);
```

### Multi-Page Feature Pattern

For features with list/create/edit sub-pages, use **separate page objects** and spec files for each:

```
e2e/features/{feature-name}/
├── {feature-name}-list.ts
├── {feature-name}-create.ts
├── {feature-name}-edit.ts
├── {feature-name}-list.spec.ts
├── {feature-name}-create.spec.ts
├── {feature-name}-edit.spec.ts
└── mocks/
    ├── {feature-name}-mocks.ts
    └── setup-{feature-name}-mocks.ts
```

**Key considerations for create vs edit pages:**
- **Create page** (entity ID is falsy): may show inline delete buttons, hide settings menus
- **Edit page** (entity ID is truthy): may show settings menus, hide inline delete buttons
- **Item test-id mapping**: the test-id may reference a different ID property depending on the page mode (e.g. a wrapper entity ID vs the raw entity ID). Always read the template to confirm which ID is used in `[attr.data-testid]`

---

## Anti-Patterns (NEVER DO)

| Anti-Pattern | Correct Approach |
|---|---|
| Copy-paste same setup into every test | Extract into `beforeEach` of a `describe` block |
| Write many granular tests with identical setup | Consolidate into comprehensive tests (see Test Consolidation Strategy) |
| Skip edge case testing | Always test security, boundaries, special chars, unicode, concurrent ops (see Edge Case Checklist) |
| Skip negative testing | Test error paths, validation, empty states, malformed inputs |
| Test only happy path | Test error scenarios, edge cases, boundary values, race conditions |
| Use CSS selectors (`page.locator('.my-class')`) | Use `page.getByTestId('my-test-id')` — exceptions: `#toast-container .toast-success/error` (no test-ids on toasts), `.cdk-overlay-backdrop` (CDK), `mat-option` (Angular Material) |
| Wrap assertions in `if (condition) { ... }` inside a test body | If the condition might be false, the test passes with zero assertions — use `expect(condition).toBeDefined()` / `expect(condition).not.toBeNull()` before relying on it |
| Write `await page.waitForTimeout(N)` without a comment | Every `waitForTimeout` must have a comment explaining what it is waiting for (debounce, animation, delayed effect) |
| Leave an empty `describe` block with a `beforeEach` but no tests | Remove it entirely — it runs setup for zero tests and adds noise |
| Construct mock objects manually | Use codegen builders (`aProduct()`, `aClient()`) |
| Write tests without verifying test-ids exist | Phase 7 is mandatory -- check templates first |
| Import `test` directly from `@playwright/test` | Import `test` from `@e2e/features` |
| Test name like `'table'` or `'form validation'` | Test name like `'should display table with 2 rows'` |
| One giant `describe` with 20 tests and identical setup | Nested `describe` blocks with scoped `beforeEach` |
| Magic strings/numbers without context | Use constants or mock data references |
| Skip mock setup for related entities | Mock ALL GraphQL operations the page calls |
| Modify existing shared mock defaults (add/change fields) | Create new named mock variants -- changing defaults shifts faker sequence |
| Write GQL mocks without verifying store makes real HTTP requests | Read store code first -- hardcoded data means `addMock()` is useless |
| Batch all changes and test only at the end | Run `pnpm e2e` after each set of new files |
| Remove or modify existing comments in code | Preserve all existing comments exactly as they are |
| Read/reference files from neighboring workspace projects | Work ONLY within the current project directory |
| Use `[attr.data-testid]` on `src-button` / source-ui-native components | Use `[data-testid]` (property binding) |
| Use `[attr.data-testid]` for plain HTML elements (`<li>`, `<div>`) | `[attr.data-testid]` IS correct for plain HTML elements |
| Use `toHaveClass('src-button--pressed')` (exact string) | Use `toHaveClass(/src-button--pressed/)` (regex) |
| Assume every feature route is nested | Check `app.routes.ts` to verify actual route hierarchy |
| Assume `@if` placement without reading the template | Always verify `@if` / `@for` placement before writing visibility assertions |
| Write tests for Unreal-dependent UI elements | Check for `@defer (when !!isInitApi())` -- if present, only URL and GQL error tests are viable |
| Assume modal feature needs its own route | Modal features test from the host page; `goto()` navigates to host |
| Duplicate mock setup class logic for modal features | Compose by wrapping the host setup class |
| Mock external API URLs (e.g. ecom-api.3dsource.com) | GQL interceptor only intercepts relative-path requests -- external failures show as toasts |
| Chain `.locator('button').click()` for src-button / src-icon-button | Use plain `.click()` directly on `getByTestId()` -- no inner `.locator('button')` needed |
| Change test assertions to match buggy app behavior | Report the bug to the user and fix the component, not the test |
| Click mat-select immediately after another mat-select closes | Use `waitForOverlayToDisappear()` between sequential select interactions |
| Write tests for stateful components without analyzing data flow | Trace signal/effect/store chain first; flag race conditions as bugs |
| Assume test-id uses the raw entity `id` on every page | Read the template — wrapper entities may use a different ID property (e.g. `productId`, `component.id`) |
| Use page object `goto()` for GQL error redirect tests | Use `page.goto()` directly — `goto()` asserts container visible and hangs when page redirects |
| Create a new `describe` block with same name when extending a spec | Read the spec first; add tests inside the existing block |
| Pass plain object for JSON string fields in mock data | Use `JSON.stringify()` — Angular parses the string; plain object breaks conditional rendering |
| Use Playwright `download` event for blob download triggered by programmatic `<a>` click | Use `page.waitForRequest()` + `page.route()` to intercept the HTTP request instead |
| Look for CDK Dialog element with special locator | `page.getByTestId()` finds test-ids in CDK overlay DOM — no special handling needed |
| Serve the app with the default `ng serve` for local e2e | Serve with `--configuration=playwright` — default env (`playwright: false`) hits the real API and every render test redirects to the list view |
| `locator.hover()` a sibling to leave an absolutely-positioned overlay | Move the pointer to a coordinate outside it (`page.mouse.move(farX, y)`) — the overlay intercepts pointer events |
| Assume the pointer starts neutral when asserting an "unhovered" baseline | Mouse position carries across steps/tests — explicitly move it away first |
| Mutate the populated mock to test a falsy `@if`/ternary branch | Add a new `…EmptyMock` variant + `setup…EmptyDetails()` and a separate `describe` block |

---

## Critical Rules

### 1. Never adjust tests to hide application bugs

If a test fails because the application behaves differently from the expected user flow, **report the bug to the user** instead of changing the test expectation to match the broken behavior. E2e tests define the intended behavior -- if the app doesn't match, the app is wrong, not the test.

### 2. Wait for mat-select overlay to close before opening another

Angular Material `mat-select` uses CDK overlay with backdrop. When clicking one select after another, always wait for the previous overlay to disappear first.

```typescript
private async waitForOverlayToDisappear() {
  try {
    const overlay = this.page.locator('.cdk-overlay-backdrop');
    await expect(overlay).toBeHidden();
  } catch {
    // Overlay might not be present
  }
}
```

### 3. Analyze component data flow before writing tests

Before writing tests for a component with reactive state (signals, effects, stores):
1. Trace the full data flow: where does the initial state come from? What triggers updates?
2. Identify potential race conditions between async data sources
3. Check if UI is gated behind Unreal API (`isInitApi`, `viewportReady`) -- if so, only navigation and error tests apply
4. Only then write tests that assert the **intended** behavior

---

## Quick Checklist

Before marking the task as done, verify:

- [ ] Feature type determined: routable page / modal / Unreal-dependent
- [ ] Mock data uses codegen builders with feature-prefixed IDs
- [ ] Mock setup class covers all GraphQL operations the page calls
- [ ] `GET /features` REST mock registered in every `setupFeaturesFlags()`
- [ ] Page Object uses only `getByTestId()` selectors
- [ ] `src-button` / `src-icon-button` interactions use plain `.click()` (no `.locator('button')` chain)
- [ ] All test-ids verified in Angular templates (Phase 7)
- [ ] Missing test-ids added using correct binding type (`[data-testid]` for source-ui-native, `[attr.data-testid]` / static for plain HTML)
- [ ] Page Object registered in `e2e/features/index.ts`
- [ ] Spec imports `test` and `expect` from `@e2e/features`
- [ ] Role-based tests use `test.use({ storageState: 'e2e/.auth/ROLE_*.json' })`
- [ ] No duplicated setup across tests -- common steps in `beforeEach`
- [ ] Nested `describe` blocks for distinct scenarios
- [ ] Test names start with `'should ...'` and read as sentences
- [ ] No TypeScript compilation errors (run `pnpm lint --quiet`)
- [ ] Store data flow verified -- store makes real GQL requests (not hardcoded data)
- [ ] External API calls (non-relative URLs) identified and NOT mocked
- [ ] No existing shared mock defaults were modified -- only new variants added
- [ ] All existing comments in modified files preserved
- [ ] No files from neighboring projects were referenced
- [ ] Route path verified against `app.routes.ts`
- [ ] `toHaveClass` uses regex patterns (not exact strings) for partial class matching
- [ ] Template `@if` / `@for` placement verified before writing visibility assertions
- [ ] mat-select interactions include `waitForOverlayToDisappear()` when chaining
- [ ] Component data flow analyzed for race conditions
- [ ] Conditional rendering guards checked: correct elements expected on create vs edit page
- [ ] Item test-id property verified against template (not assumed to be raw entity `id`)
- [ ] For Unreal-dependent features: only URL + GQL error tests written (not UI element tests)
- [ ] For modal features: host page setup class composed (not duplicated)
- [ ] Test failures investigated as potential app bugs before adjusting test expectations
- [ ] GQL error redirect tests use `page.goto()` directly, not the page object's `goto()`
- [ ] JSON string fields in mocks use `JSON.stringify()` (not plain objects)
- [ ] File download tests use `page.waitForRequest()` + `page.route()` (not `download` event)
- [ ] When extending an existing spec file: read the whole file first to avoid duplicate `describe` blocks
- [ ] **E2E tests run successfully** - `pnpm e2e` passes (MANDATORY)
- [ ] **Test consolidation applied** - related tests combined, no unnecessary duplication
- [ ] **Edge Case Checklist complete** - security, boundaries, special chars, unicode, concurrent ops, errors, empty states tested
- [ ] **Negative testing included** - error paths, validation failures, malformed inputs tested
- [ ] **Every API operation has error test** - All mutations and queries tested for both success and failure
- [ ] **No vacuous `if` in test bodies** - every `if (condition)` either has `expect(condition).not.toBeNull()` guard or is removed in favor of guaranteed mock data
- [ ] **No empty `describe` blocks** - every `describe` has at least one test
- [ ] **All `waitForTimeout` calls have comments** - each explains what it is waiting for
