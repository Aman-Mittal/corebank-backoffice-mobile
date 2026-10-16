This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This project

- **Name and trademarks.** The app is "CoreBank Backoffice". Do not use "Fineract" in names,
  identifiers, bundle ids or UI text. It may appear only where the backend's API requires it (HTTP
  header names, URL paths) and in the compatibility statement in DISCLAIMER.md, NOTICE and the
  About screen.
- **Routes** live in `src/app/` and only compose screens from `src/features/*`.
- **Adapters** ([DOCS/ADAPTERS.md](DOCS/ADAPTERS.md)): features reach libraries and the API only
  through `useAdapter(TOKEN)`. Generated API types stay in `src/core/adapters/api`.
- **Tests** are Vitest (`npm test`), not Jest.
- **E2E-first** ([DOCS/E2E.md](DOCS/E2E.md)): write the Playwright spec and Maestro flow, list the
  id in `expected-red.json`, then implement. Every selector is a `TID.*` from
  `e2e/shared/testids.ts`.
- **Licences:** dependencies must pass `npm run check:licenses` (ASF policy; no GPL or LGPL, even in
  dev tooling). New files need the header (`node scripts/add-license-header.mjs <file>`).
- **Memory:** the dev machine is RAM-constrained. Run heavy suites (docker stack, emulator,
  Playwright backend) one at a time.
- **Before declaring a task done,** run:
  `npm run lint && npm run typecheck && npm test && npm run check:expected-red && npm run check:testids && npm run i18n:check`.
