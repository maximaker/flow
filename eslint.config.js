/**
 * Flat ESLint config. Strict on real bugs (unused vars, undef, no-debugger,
 * unsafe regex), permissive on stylistic preferences (Prettier owns those).
 *
 * Run:
 *   npm run lint       # fails on errors
 *   npm run lint:fix   # auto-fix where possible
 */
import js from '@eslint/js'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.claude/',
      'app.js', // root-level legacy file (already deleted; kept here in case it returns)
    ],
  },

  // ── Base JS rules ─────────────────────────────────────────────────────────
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Custom globals exposed by Flow's render layer.
        app: 'readonly',
      },
    },
    rules: {
      // Bug catchers
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-implicit-globals': 'error',
      'no-undef': 'error',
      'no-debugger': 'error',
      'no-alert': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-return-await': 'warn',
      'no-throw-literal': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'warn',
      'no-unreachable-loop': 'error',
      'require-atomic-updates': 'warn',

      // Quality / clarity
      'eqeqeq': ['error', 'smart'],
      'prefer-const': 'warn',
      'no-var': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],

      // We deliberately strip console.* in production via vite.config.js
      // pure-functions, so leaving console.warn/error in source is fine.
      'no-console': 'off',

      // Off — Prettier territory.
      'semi': 'off',
      'quotes': 'off',
      'comma-dangle': 'off',
      'indent': 'off',
    },
  },

  // ── Vue SFC rules ─────────────────────────────────────────────────────────
  ...vuePlugin.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // The reference uses single-word component names (App, Breadcrumb) —
      // align with that rather than the multi-word default.
      'vue/multi-word-component-names': 'off',
      // Allow self-closing on void elements; let prettier handle the rest.
      'vue/html-self-closing': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/html-indent': 'off',
      'vue/attributes-order': 'warn',

      // ── A11y: not from eslint-plugin-vuejs-accessibility (extra dep), but
      // catch the worst offenders with plain Vue rules. ────────────────────
      // No-op click handler on a non-interactive element is a real bug.
      'vue/no-v-html': 'warn',
    },
  },

  // ── Vitest globals for unit + integration tests ──────────────────────────
  {
    files: ['tests/**/*.js', 'tests/**/*.test.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // ── Playwright specs use their own runner; no Vitest globals here ────────
  {
    files: ['tests/e2e/**/*.spec.js'],
    rules: {
      'no-unused-vars': 'off',
    },
  },

  // ── Scripts use Node APIs ─────────────────────────────────────────────────
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
]
