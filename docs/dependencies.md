# Dependency rationale

This project intentionally keeps the runtime dependency surface minimal to preserve bundle size, maintainability, and auditability. Each package below meets one of the constitutional goals (static-first delivery, accessibility, testing coverage, or developer experience).

## Runtime

| Package        | Version (lockfile) | Purpose                                                                                                                                   | Notes                                                                                                     |
| -------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `nuxt`         | ^3.12.0            | Application framework providing static generation, file-based routing (opted-out in favour of custom root app), and Vite-based toolchain. | Required for the Nuxt 3 static architecture defined in the plan; no optional modules enabled beyond core. |
| `@nuxt/eslint` | ^1.9.0             | Integrates ESLint with Nuxt for consistent lint configuration and type-aware rules.                                                       | Bundles recommended Nuxt rules; keeps lint setup aligned with framework updates.                          |
| `eslint`       | ^9.37.0            | Core linting engine enforcing strict TypeScript + Vue rules.                                                                              | Drives CI lint gate and local feedback.                                                                   |

## Tooling & build-time

| Package                                    | Role                                                                  | Justification                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `@nuxtjs/tailwindcss`                      | Tailwind module for Nuxt; injects PostCSS pipeline and design tokens. | Single utility-class system mandated by the plan; avoids additional UI frameworks. |
| `tailwindcss` / `postcss` / `autoprefixer` | CSS tooling stack.                                                    | Required for Tailwind compilation and cross-browser compatibility.                 |
| `typescript`                               | Type checking for Vue SFCs and support files.                         | Enables strict typings enforced across services/composables.                       |
| `@vitejs/plugin-vue`                       | Compiles Vue SFCs within Vite.                                        | Brought in via Nuxt build, but pinned explicitly for tooling parity in tests.      |
| `prettier`                                 | Code formatting baseline shared in CI and IDEs.                       | Keeps prose (docs) and config consistent.                                          |

## Testing & quality

| Package                                | Role                                                          | Justification                                            |
| -------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| `vitest`                               | Primary unit/integration runner with Vite-native environment. | Mirrors Nuxt runtime for fast TDD loops.                 |
| `@vue/test-utils`                      | Component testing utilities.                                  | Required to mount Vue SFCs in unit tests.                |
| `@types/node`, `@types/jsdom`, `jsdom` | Provide DOM-like environment for Vitest suites.               | Ensure TypeScript coverage and deterministic unit tests. |
| `@playwright/test`                     | End-to-end smoke coverage of generated static output.         | Validates real browser behaviour per specification.      |
| `axe-core`                             | Accessibility assertions in automated checks.                 | Satisfies WCAG AA audit requirement.                     |

## Tooling scripts

| Package | Role                                                                               | Justification                                                                      |
| ------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `serve` | Lightweight static file server used by Playwright config to host `.output/public`. | Matches Playwright webServer requirements without introducing a heavier framework. |

All other scripts lean on built-in Node.js modules. If a new dependency is proposed, add an entry here with goal alignment before merging.
