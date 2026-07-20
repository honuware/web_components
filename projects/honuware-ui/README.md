# @honuware/ui

Reusable, brand-free Angular UI + server-access framework — the shared component library behind the Knotty Yoga app, packaged for reuse by other Angular apps that talk to a compatible ("honuware") backend.

Published as **eight secondary entry points** under `@honuware/ui/*`; import only what you need — each is independently tree-shakeable (`sideEffects: false`).

## Install

```bash
npm install @honuware/ui
```

Peer dependencies (Angular 21 — install if you don't already have them): `@angular/animations`, `@angular/cdk`, `@angular/common`, `@angular/core`, `@angular/forms`, `@angular/material`, `@angular/router`, and `rxjs`. The library's only runtime dependency is `tslib`.

## Entry points

| Entry | What's in it |
|---|---|
| `@honuware/ui/foundation` | `ToastService`, `hw-confirm-dialog`, fuse animations, microsecond date-formatting utils, `sanitizeReturnUrl`. No internal deps. |
| `@honuware/ui/access` | The narrow `CrudAccess` / `AuthAccess` / `PhotoAccess` interfaces + `HONUWARE_*_ACCESS` tokens; framework DTOs (`DatabaseSchema`, `DataResults`, `ColumnDataInfo`, admin/photo types, `UserInfo`/`LoginInfo`…); the RFC 7807 stack (`ProblemDetails`, `ErrorService`); `CsrfInterceptor`; `PhotoUrlBuilder`; the request-serializing proxy + default HTTP implementations; and `provideHonuwareAccess()`. |
| `@honuware/ui/controls` | Schema-driven field controls (`hw-simple-text` / `-long-text` / `-simple-bool` / `-simple-enum` / `-simple-date`), the `hw-composite-control` type dispatcher, and `hw-fk-picker`. |
| `@honuware/ui/photos` | `hw-photo-upload` — drag-drop, client-side resize/re-encode to JPEG, deferred-upload mode, `userMode` avatar path. |
| `@honuware/ui/auth` | `AuthService` + `AuthData`/permission helpers, the five route guards, `ErrorInterceptor`, the login/register/verify pages (`hw-login` / `-register` / `-verify`), the `AUTH_ROUTES` config token, and the `tryTokenLoginInitializer` bootstrap factory. |
| `@honuware/ui/crud` | The generic table editor: `DatabaseSchemaService`, table-binding utils, the `hw-table-view-control` / `hw-composite-row-control` containers, the TableView/Edit/New pages, and the `CRUD_EDITOR_ROUTES` token. |
| `@honuware/ui/square` | `SquarePaymentService` (Web Payments SDK loader + card tokenizer) behind the `SQUARE_CONFIG` token. Depends on nothing internal. |
| `@honuware/ui/testing` | In-memory mocks for tests — `MockCrudAccess` (schema-driven store), `MockAuthAccess` (session simulator), `MockPhotoAccess`, and `provideHonuwareAccessMock()`. |

**Layering** (an entry may import only the entries below it): foundation → access → {controls, photos, auth} → crud; `square` is standalone; `testing` depends on access + auth.

## Configuring the framework

Library components inject **narrow tokens** rather than a concrete client, so you wire them once.

### Server access

```ts
import { provideHonuwareAccess } from '@honuware/ui/access';

providers: [
  // 'http' (default): the built-in request-serializing proxy over the standard
  // honuware endpoints, off a base path (HONUWARE_API_BASE, default '/api').
  provideHonuwareAccess(),
]
```

Or point the three `HONUWARE_{CRUD,AUTH,PHOTO}_ACCESS` tokens at your own client. For tests, use mock mode:

```ts
import { provideHonuwareAccessMock } from '@honuware/ui/testing';
providers: [provideHonuwareAccessMock({ crud: { schema } })]
```

### Config tokens

- **`AUTH_ROUTES`** (`@honuware/ui/auth`) — where login/register/change-password live + the post-login `returnUrl` allowlist. Guards, the auth pages, and `ErrorInterceptor` read it.
- **`CRUD_EDITOR_ROUTES`** (`@honuware/ui/crud`) — the base path the generic table editor is mounted at.
- **`SQUARE_CONFIG`** (`@honuware/ui/square`) — the Square `applicationId` / `locationId` / `scriptUrl`.
- **`tryTokenLoginInitializer`** (`@honuware/ui/auth`) — wire into an `APP_INITIALIZER` (`deps: [AuthService]`) for silent re-auth at bootstrap.

Each token has a sensible root-provided default, so the minimal setup is `provideHonuwareAccess()` + a Material theme.

## Styling

The components use **Angular Material**, so a consumer **must** set up a Material theme — otherwise the components render unstyled:

```scss
// styles.scss
@use '@angular/material' as mat;
// … your mat.theme(...) definition / include
```

The library reads **no CSS custom properties** — you don't need to define any `--vars`. Component styles are self-contained (inlined at build); there is no global stylesheet to import.

**Caveat (pre-"Website Makeover").** A handful of component styles still hardcode colors — an M2 indigo/pink palette assumption, plus semantic colors like `#f44336` (errors) and `#d1d5db` (card borders). A consumer whose Material theme differs will see these until the makeover moves them onto theme / CSS-variable hooks.

## License

Apache-2.0
