# honuware/web_components

Home of **`@honuware/ui`** — a reusable, brand-free Angular UI + server-access
framework. This repository is the standalone source for the component library
that also powers the Knotty Yoga app.

> **Provenance.** `@honuware/ui` was extracted from the private `knottyyoga`
> repository at commit `da7ec9f9ff7f46c9120194805ca4bb7d68426411`. The library
> is developed here going forward; knottyyoga consumes it as a published package.

The publishable library lives in [`projects/honuware-ui/`](projects/honuware-ui).
Its consumer-facing documentation (entry points, tokens, styling) is in the
[package README](projects/honuware-ui/README.md), which ships with the npm package.

## Requirements

- **Node** ≥ 20.19 (or ≥ 22.12) and **npm** 11+
- A local **Chrome** (headless) for the unit-test run
- **Angular 21** toolchain (installed via `npm install`)

## Getting started

```bash
npm install            # install the workspace toolchain + framework deps
npm run build          # ng build honuware-ui  -> dist/honuware-ui (all 8 entry points)
npm test               # ng test honuware-ui (headless Chrome, single run)
npm run lint           # ng lint honuware-ui (boundary rules enforced)
npm run pack           # npm pack ./dist/honuware-ui (inspect the tarball)
```

`npm run build` emits partial-Ivy FESM2022 bundles + typings for all eight
secondary entry points into `dist/honuware-ui`.

## Entry points

`@honuware/ui` is published as **eight secondary entry points**; import only
what you need (each is independently tree-shakeable, `sideEffects: false`):

| Entry | Summary |
|---|---|
| `@honuware/ui/foundation` | Toast, confirm-dialog, animations, date utils, `sanitizeReturnUrl` |
| `@honuware/ui/access` | `CrudAccess`/`AuthAccess`/`PhotoAccess` seams + tokens, DTOs, error stack, `CsrfInterceptor`, `PhotoUrlBuilder`, HTTP impls, `provideHonuwareAccess()` |
| `@honuware/ui/controls` | Schema-driven field controls, `hw-composite-control`, `hw-fk-picker` |
| `@honuware/ui/photos` | `hw-photo-upload` (drag-drop, client resize, deferred/avatar modes) |
| `@honuware/ui/auth` | `AuthService`, route guards, `ErrorInterceptor`, login/register/verify pages, `AUTH_ROUTES` |
| `@honuware/ui/crud` | The generic table editor: `DatabaseSchemaService`, containers, pages, `CRUD_EDITOR_ROUTES` |
| `@honuware/ui/square` | `SquarePaymentService` + `SQUARE_CONFIG` (no internal deps) |
| `@honuware/ui/testing` | In-memory `MockCrudAccess`/`MockAuthAccess`/`MockPhotoAccess` + `provideHonuwareAccessMock()` |

## Layering

An entry may import **only the entries below it** — enforced twice: by
ng-packagr's build-time cycle detection **and** by ESLint `no-restricted-imports`
(`eslint.config.mjs`):

```
foundation → access → { controls, photos, auth } → crud
square      (standalone — depends on nothing internal)
testing     (depends on access + auth)
```

Library code may never import from a consuming app.

## Publishing

Published to the public npm registry as `@honuware/ui` under 0.x semantics.
Releases are cut by CI on a tag with provenance (see the CI workflow / Phase 4.2
of the extraction plan) — not published by hand.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the layering rule, selector prefix,
test policy, and the local build/test/lint loop.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
