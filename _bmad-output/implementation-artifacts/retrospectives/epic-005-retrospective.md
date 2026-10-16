# Epic 5 Retrospective — Monetization & Support

**Date:** 2026-10-16  
**Status:** Completed  
**Stories Delivered:**
- 5-1: Visible subscription state
- 5-2: In-app support ticket
- 5-3: Refund mechanism (5-3a..5-3h)
  - 5-3a: Persist crash event
  - 5-3b: Instrument login failure
  - 5-3c: Refund schema migration
  - 5-3d: Pure three-path classifier
  - 5-3e: Refund router & appeal procedures
  - 5-3f: SSLCommerz provider executor with deterministic deduplication
  - 5-3g: Settlement poller with partition scheduling and retry windows
  - 5-3h: Native refund UI and error screen hardening
- 5-4: SSLCommerz payment gateway
- 5-5: Cancellation preserves access

---

## What Went Well

1. **Exhaustive Unit & Edge Case Testing**:
   - Built a comprehensive suite of 117 unit tests in `packages/api/src/lib/__tests__/` covering classifier rules (`5.3d`), charge filters (`5.3e`), provider normalization (`5.3g`), provider executor retry matrices (`5.3f`), and candidate poller partitioning (`5.3g`).
   - Pure functional design of `classifyRefundRequest` and `partitionPollerCandidates` made edge cases (72h login windows, crash counts across 7/14 days, retry windows across 24 hours) fast and deterministic to verify without database mocking overhead.
2. **Double-Payment & Concurrency Prevention**:
   - Provider refunds enforce compare-and-swap state transition (`status: approved/auto_approved -> processing`) before issuing network calls to SSLCommerz.
   - Deterministic deduplication key generation prevents replay duplicate refunds at the gateway level.
3. **Robust Native UI Error States**:
   - Hardened `apps/native` routes (`home.tsx`, `subscription.tsx`, `ticket/[id].tsx`, `ticket/index.tsx`, `matching.tsx`, `lobby.tsx`) with clear `<EmptyState />` fallbacks and retry refetch actions, preventing query network blips from misleading users into thinking records were deleted.

---

## What Could Be Improved / Pitfalls Caught

1. **Unit Ambiguity between Schema and Gateways**:
   - Clarified that charge amounts in `paymentTransaction` are stored in whole taka rather than poisha, avoiding double division when constructing gateway refund payloads.
2. **Poller Polling Cadence & Timeouts**:
   - SSLCommerz API responses default to HTTP 200 even for logical declines; parsing required strict validation of both `APIConnect` and `status` fields.
3. **Linter Formatting Divergence**:
   - Ultracite/Biome formatting should be run on staged chunks to avoid massive whitespace diffs across untouched lines.

---

## Verification Evidence

- `bun test packages/api`: 244 pass, 0 fail (12 test suites, 97ms)
- `bun test --cwd apps/native utils && pnpm --filter native test`: 18 pass, 0 fail (4 test suites)
- `turbo check-types --force`: 10/10 workspace packages pass type checking with 0 errors.

---

## Next Steps

- **Epic RE-3**: Recommendation feed integration on mobile client (`re-3-1-native-mobile-recommendation-feed-expo`).
- **Epic Native Phase 1**: Core flagship screen implementation per `apps/native/ARCHITECTURE.md`.
