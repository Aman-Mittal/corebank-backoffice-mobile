# Lint policy

ESLint 9 flat config (`eslint.config.js`). Every plugin is MIT or Apache-2.0.

## No eslint-plugin-sonarjs

`eslint-plugin-sonarjs` is **LGPL-3.0-only**, which the ASF classes as Category X. It is not used,
not even as a devDependency, because `package.json` travels in the source distribution. This is the
same decision fineract-backoffice-ui made; its `DOCS/LINT_POLICY.md` maps every sonarjs rule to its
replacement.

| What sonarjs covered                                  | What covers it here                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| Cognitive complexity                                  | `local/cognitive-complexity`, threshold 15, ported with exact-score tests |
| Security hotspots (eval, pseudo-random, unsafe regex) | `eslint-plugin-security` (Apache-2.0)                                     |
| Unused, duplicate and unresolved imports              | `eslint-plugin-import`, `typescript-eslint`                               |
| Language pitfalls                                     | `eslint-plugin-unicorn` (unopinionated), `eslint:recommended`             |
| Everything else (duplication, smells, hotspots)       | SonarCloud, server side ([SONAR.md](SONAR.md))                            |

## Boundaries

Each boundary has its own rule id, so their suppressions are counted separately.

| Rule                            | Holds                                                                   |
| ------------------------------- | ----------------------------------------------------------------------- |
| `local/no-generated-api-import` | Generated API types stay in `src/core/adapters/api` (alias-aware: `@/`) |
| `local/no-vendor-ui-import`     | UI primitive libraries stay in `src/ui`                                 |
| `no-restricted-imports`         | Each wrapped library stays inside its adapter                           |
| `no-restricted-globals`         | No direct `localStorage` or `sessionStorage`                            |

## React and accessibility

- `react`, `react-hooks` (including the React Compiler rules) everywhere.
- `jsx-a11y` on `.web.tsx` files.
- `eslint-plugin-react-native-a11y` was evaluated and **not adopted**: it supports ESLint 8 and
  older only. Native accessibility is instead covered by axe on the web export (same components
  through react-native-web) and by Maestro flows that select by accessible ids.
