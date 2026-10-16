# ADR 0003: Owned UI primitives

- **Status:** Accepted, 2026-10-07

## Decision

Screens use primitives from `src/ui` only. Third-party UI primitive libraries (NativeWind and
`@rn-primitives` in Phase 1) may be imported only inside `src/ui`, which `local/no-vendor-ui-import`
enforces. That keeps a future replacement local to one directory, as fineract-backoffice-ui's
ADR 0005 does for Ionic.

Phase 0 uses `StyleSheet` with tokens from `src/ui/theme.ts`, so moving to NativeWind tokens
changes that file, not the screens.
