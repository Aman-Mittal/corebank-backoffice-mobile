# The OpenAPI spec and the generated types

The API types in `src/api/generated/openapi.d.ts` are generated from the Apache Fineract OpenAPI
document. Neither the document nor the types are committed, because this repository is pushed
through the GitHub MCP, which carries every file inline as text. The app icons in `assets/` are
left out for the same reason.

`npm run setup`, run after `npm install` locally and in every CI job, rebuilds them:

1. **`scripts/fetch-spec.mjs`** downloads the document from the URL pinned in
   `spec/spec.lock.json`, a fixed commit of fineract-backoffice-ui (Apache-2.0). It refuses the
   file unless its sha256 matches the lock, so every machine generates from byte-identical input.
2. **`npm run api:generate`** rewrites the operationIds deterministically
   (`scripts/preprocess-spec.mjs`), then runs `openapi-typescript`.
3. **`scripts/generate-icons.mjs`** writes placeholder icons. Replace them before a store release.

`npm run api:check` (CI) verifies the spec on disk against the lock.

## Updating the spec

1. Find a commit whose `public/api/fineract.json` is the version you want.
2. Set `url` in `spec/spec.lock.json` to its raw URL at that commit SHA. Never use a branch name.
3. Set `sha256` to the file's `sha256sum`.
4. Run `npm run setup && npm run typecheck && npm test`.

Mapper tests run against captured payloads, so a spec change that breaks a mapping fails in the
test suite rather than on a screen.

## `package-lock.json`

The lockfile is not committed either: at about 680 KB it exceeds what one MCP call can carry. CI
resolves with `npm install`. Version drift is held by the exact Expo SDK ranges, by
`npx expo install --check`, and by the licence gate, which runs on the tree that actually
resolved.
