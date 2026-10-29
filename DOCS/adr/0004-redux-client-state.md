# ADR 0004: Redux Toolkit for client state

- **Status:** Accepted, 2026-10-29

## Context

Who is signed in, and therefore what they may do, was held in a hand-written `SessionStore`
class with its own listener set. The profile screen (P1-10) adds a second piece of state that
belongs to the session: the signed-in user's own record, the password policy and the state of a
password change. It must be dropped when the session ends, and it is read by more than one
component.

## Decision

Client state lives in one Redux Toolkit store (`src/state/store.ts`), held in the adapter
registry as `APP_STORE` and provided to React with `react-redux`'s `Provider`.

| Slice     | Holds                                                                    | File                                    |
| --------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `session` | `SessionState`: restoring, signed out (with a reason), second factor, in | `src/core/auth/session-slice.ts`        |
| `profile` | the user's record, the password policy, a password change in progress    | `src/features/profile/profile-slice.ts` |

- **Permissions are selectors**, not state: `selectGranted` and `selectPermitted(access)` derive
  from `session` with `createSelector`, so they cannot drift from the session. `usePermission`,
  `<Can>` and `RequireAccess` read them through `useAppSelector`.
- **`SessionStore` stays the session's API.** Its async work (secure storage, invalidating a
  second-factor token) is unchanged; it dispatches `session` actions instead of keeping its own
  field. The HTTP pipeline, which runs outside React, still reads `authState()` from it.
- **Thunks reach the API through the registry.** The store's thunk extra argument is the
  registry's `resolve`, so a thunk asks for `PROFILE_API` exactly as a hook asks `useAdapter`, and
  tests substitute fakes the same way.
- **The session's end clears the profile.** `profile` resets on `session/signedOut` and
  `session/signedIn`, so nothing read under one user is shown to the next.
- **State is serializable.** A failure is stored as `SerializedAppError` and turned back into an
  `AppError` for display (`fromSerialized`).

## What stays in TanStack Query

Server data that is listed, paged, cached and invalidated by key (offices, staff, clients and
their KYC records) stays in TanStack Query. Redux is for state that belongs to the session or the
app, not a second cache of server collections.

## Licences

`@reduxjs/toolkit`, `react-redux` and their dependencies (`redux`, `redux-thunk`, `reselect`,
`immer`, `use-sync-external-store`) are MIT: Category A.
