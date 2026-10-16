# Offline behaviour

This is decided up front, because a banking backoffice that guesses here moves money twice.

**Works offline:**

- **Reference data** that was read recently, such as offices, codes, products and currencies. It is
  cached in the `queryCache` storage key for up to 24 hours, and cleared on sign-out and on a server
  or tenant change.
- **Collection-sheet saves** (Phase 2). They are queued with a client-generated idempotency key and
  replayed in order on reconnect. Conflicts are shown for review, never resolved silently.

**Does not work offline:**

- every other money movement: disbursement, repayment, transfer, approval;
- accounting;
- administration and configuration;
- reports and bulk import.

These controls are disabled while offline, with the reason shown.

Client, loan and balance data is never persisted to the device.
