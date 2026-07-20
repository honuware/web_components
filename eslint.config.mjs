// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

// --- Componentization boundary rules (extracted from knottyyoga) ---------
// (1) honuware library code must never import from a consuming app.
// (2) each @honuware/ui entry point may import only the entries BELOW it.
// (These are enforced a second time by ng-packagr's cycle detection at build.)

const APP_IMPORT_PATTERNS = [
  '@access/*', '@app/*', '@core/*', '@pages/*',
  '@controls/*', '@shared/*', '@crud/*',
  'src/app/*', 'src/environments/*', 'src/types/*',
];

const APP_IMPORT_MESSAGE =
  'honuware library code must not import from a consuming app (@core/@shared/@pages/@controls/@crud/@app/@access or src/*). ' +
  'Depend on a lower @honuware/ui entry point or a narrow injected seam instead.';

// Bottom-to-top: each entry point lists the entries it is allowed to import.
const ALLOWED_BELOW = {
  foundation: [],
  access: ['foundation'],
  controls: ['foundation', 'access'],
  photos: ['foundation', 'access'],
  auth: ['foundation', 'access'],
  crud: ['foundation', 'access', 'controls', 'photos', 'auth'],
  square: [],
  testing: ['foundation', 'access', 'auth'],
};
const ALL_ENTRIES = Object.keys(ALLOWED_BELOW);

function libraryRestrictedImports(entry) {
  const forbiddenEntries = ALL_ENTRIES.filter(
    (e) => e !== entry && !ALLOWED_BELOW[entry].includes(e),
  );
  const patterns = [{ group: APP_IMPORT_PATTERNS, message: APP_IMPORT_MESSAGE }];
  if (forbiddenEntries.length) {
    patterns.push({
      group: forbiddenEntries.map((e) => `@honuware/ui/${e}`),
      message:
        `@honuware/ui/${entry} may import only the entry points below it ` +
        `(${ALLOWED_BELOW[entry].join(', ') || 'none'}) — not a sibling or higher entry.`,
    });
  }
  return /** @type {const} */ (['error', { patterns }]);
}

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', '.angular/**'],
  },

  // ---- Library TypeScript (all entries: recommended + hw selector prefix) ----
  {
    files: ['projects/honuware-ui/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'hw', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'hw', style: 'kebab-case' }],
      '@angular-eslint/prefer-inject': 'off',
    },
  },
  // ---- Library boundary rules ----
  // Production files: app-path ban + downward-only entry imports.
  ...ALL_ENTRIES.map((entry) => ({
    files: [`projects/honuware-ui/${entry}/**/*.ts`],
    ignores: ['**/*.spec.ts'],
    rules: { 'no-restricted-imports': libraryRestrictedImports(entry) },
  })),
  // Spec files: keep the app-path ban, but drop the downward-only rule — tests
  // legitimately import `@honuware/ui/testing` (the mock helpers) and may compose
  // across entry points; the downward rule is about production bundling/cycles.
  {
    files: ['projects/honuware-ui/**/*.spec.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: APP_IMPORT_PATTERNS, message: APP_IMPORT_MESSAGE }] }],
    },
  },
  // ---- Library templates ----
  {
    files: ['projects/honuware-ui/**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
    },
  },
);
