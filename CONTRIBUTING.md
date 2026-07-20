# Contributing to `@honuware/ui`

Thanks for working on the honuware component library. This is a small, layered
library with strict boundaries; the rules below keep it clean and extractable.

## Local setup

```bash
npm install
npm run build   # ng build honuware-ui
npm test        # ng test honuware-ui (headless Chrome, single run)
npm run lint    # ng lint honuware-ui
```

All three must be green before a change lands.

## The layering rule (load-bearing)

Each secondary entry point may import **only the entries below it**:

```
foundation → access → { controls, photos, auth } → crud
square      (standalone — depends on nothing internal)
testing     (depends on access + auth)
```

- **Library code must never import from a consuming app** (no `@core`, `@shared`,
  `@pages`, `@controls`, `@crud`, `@app`, `@access`, or `src/*` paths).
- Do not create a sibling or upward import (e.g. `foundation` importing `auth`,
  or `access` importing `crud`).

This is enforced two ways, so a violation fails CI, not just review:

1. **ng-packagr** rejects cyclic/secondary-entry cycles at build time.
2. **ESLint** `no-restricted-imports` (`eslint.config.mjs`, `ALLOWED_BELOW`) bars
   app paths and non-downward entry imports. Spec files keep the app-path ban but
   may import `@honuware/ui/testing`.

If you need something from a higher layer, invert it: depend on a **narrow
injected seam** (a token/interface) that the higher layer provides, rather than
importing the higher layer.

## Component conventions

- **Selector prefix is `hw-`** (elements) / `hw` (attribute directives). The
  ESLint config enforces this.
- **Separate template and style files** — no inline `template`/`styles` in
  `@Component`.
- Configure behavior through **injection tokens**, never by forking a component.

## Tests land in the same change

Every behavioral change ships with its tests in the **same** commit/PR — new
methods on a class that has a `*_.spec.ts`, new components, new mock helpers.
"I'll add tests later" is not accepted. Model new mocks/utilities on the existing
`@honuware/ui/testing` specs.

## TypeScript

The workspace uses Angular's modern strict config (`isolatedModules: true`,
`module: "preserve"`). Re-export **types** with `export type { … }` (not a value
`export { … }`) or the build fails with TS1205.

## Commits

Keep history clean and descriptive. Do not commit `dist/`, `node_modules/`,
`.angular/`, or `coverage/` (already covered by `.gitignore`).

## License

By contributing you agree your contributions are licensed under the project's
[Apache-2.0](LICENSE) license.
