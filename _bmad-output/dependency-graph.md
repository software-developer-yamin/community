# Story Dependency Graph
_Last updated: 2026-07-02T21:48:00+06:00_

## Stories

| Story | Epic | Title | Sprint Status | Issue | PR | PR Status | Dependencies | Ready to Work |
|-------|------|-------|--------------|-------|----|-----------|--------------|---------------|
| 1.1 | 1 | Persistent Session with Secure Storage | done | #1 | — | — | none | ✅ Yes (done) |
| 1.2 | 1 | Silent Token Refresh | done | #2 | #39 | merged | 1.1 | ✅ Yes (done) |
| 1.3 | 1 | Phone Number Authentication with OTP | done | #3 | #40 | merged | 1.1 | ✅ Yes (done) |
| 1.4 | 1 | Google OAuth Integration | done | #4 | #41 | merged | 1.1 | ✅ Yes (done) |
| 2.1 | 2 | Server-Managed Room Lifecycle | done | #5 | — | — | Epic 1 | ✅ Yes (done) |
| 2.2 | 2 | ICE Restart Reconnection (1-5s Blips) | done | #6 | #42 | merged | 2.1 | ✅ Yes (done) |
| 2.3 | 2 | Full Reconnection (5-30s Blips) | done | #7 | #55 | merged | 2.2 | ✅ Yes (done) |
| 2.4 | 2 | Explicit Call End | done | #8 | #56 | merged | 2.2 | ✅ Yes (done) |
| 3.1 | 3 | Gender Filter Enforcement | done | #9 | — | — | Epic 1 | ✅ Yes (done) |
| 3.2 | 3 | Native Language Field | done | #10 | #57 | merged | Epic 1 | ✅ Yes (done) |
| 3.3 | 3 | Match Timeout with Honest State | done | #11 | #58 | merged | 3.1, 3.2 | ✅ Yes (done) |
| 4.1 | 4 | Graduated Strike System | done | #12 | — | — | Epic 2 | ✅ Yes (done) |
| 4.2 | 4 | Skip Button (In-Call Action) | done | #13 | #59 | merged | Epic 2 | ✅ Yes (done) |
| 4.3 | 4 | Distinguish Victim from Aggressor | done | #14 | #60 | merged | 4.1 | ✅ Yes (done) |
| 4.4 | 4 | Visible Moderation State | done | #15 | #61 | merged | 4.1 | ✅ Yes (done) |
| 5.1 | 5 | Visible Subscription State | done | #16 | — | — | none | ✅ Yes (done) |
| 5.2 | 5 | In-App Support Ticket | done | #17 | #64 | merged | none | ✅ Yes (done) |
| 5.3 | 5 | Refund Mechanism | blocked | #18 | — | — | 5.1 | ✅ Yes (5.1 done, blocked externally) |
| 5.4 | 5 | SSLCommerz Payment Gateway | done | #65 | #63 | merged | none | ✅ Yes (done) |
| 5.5 | 5 | Cancellation Preserves Access (FR15) | done | #66 | #67 | merged | 5.1, 5.4 | ✅ Yes (done) |
| 6.1 | 6 | State Preservation Across Backgrounding | done | #19 | #69 | merged | Epic 2 | ✅ Yes (done) |
| 6.2 | 6 | Crash Resilience | done | #20 | #70 | merged | 6.1 | ✅ Yes (done) |
| 6.3 | 6 | Reinstall Account Preservation | done | #36 | #68 | merged | Epic 2 | ✅ Yes (done) |
| 7.1 | 7 | Post-Call Rating Flow | done | #37 | #71 | merged | Epic 2 | ✅ Yes (done) |
| 7.2 | 7 | Rating Integration with Matching | done | #38 | #72 | merged | 7.1 | ✅ Yes (done) |
| re-1.1 | RE-1 | Update Content Item | done | #43 | #73 | merged | none | ✅ Yes (done) |
| re-1.2 | RE-1 | Bulk Content Import | backlog | #44 | — | — | none | ✅ Yes |
| re-1.3 | RE-1 | Secure Content Creation | backlog | #45 | — | — | none | ✅ Yes |
| re-2.1 | RE-2 | Compute Content Embedding on Creation | backlog | #46 | — | — | none | ✅ Yes |
| re-2.2 | RE-2 | Recompute Content Embedding on Update | backlog | #47 | — | — | re-1.1, re-2.1 | ❌ No (re-1.1, re-2.1 not done) |
| re-2.3 | RE-2 | Real Profile Embeddings from User Data | backlog | #48 | — | — | none | ✅ Yes |
| re-3.1 | RE-3 | Native Mobile Recommendation Feed (Expo) | backlog | #49 | — | — | re-2.1, re-2.2, re-2.3, re-5.1 | ❌ No (RE-2, RE-5 not done) |
| re-3.2 | RE-3 | Recommendation Feed Empty State Design | backlog | #50 | — | — | re-3.1 | ❌ No (re-3.1 not done) |
| re-4.1 | RE-4 | Interaction-Weighted Scoring (v2) | backlog | #51 | — | — | none | ✅ Yes |
| re-5.1 | RE-5 | User Preferences Native UI | backlog | #52 | — | — | none | ✅ Yes |
| re-6.1 | RE-6 | Admin Content Analytics | backlog | #53 | — | — | RE-1 (content lib) | ❌ No (RE-1 not complete) |
| re-7.1 | RE-7 | Secure Seed Endpoint for Production | backlog | #54 | — | — | re-1.3, RE-2 | ❌ No (re-1.3, RE-2 not done) |

## Dependency Chains

- **1.2** depends on: 1.1
- **1.3** depends on: 1.1
- **1.4** depends on: 1.1
- **2.1** depends on: Epic 1 (auth foundation)
- **2.2** depends on: 2.1
- **2.3** depends on: 2.2
- **2.4** depends on: 2.2
- **3.1** depends on: Epic 1
- **3.2** depends on: Epic 1
- **3.3** depends on: 3.1, 3.2
- **4.1** depends on: Epic 2
- **4.2** depends on: Epic 2
- **4.3** depends on: 4.1
- **4.4** depends on: 4.1
- **5.1** depends on: none
- **5.2** depends on: none
- **5.3** depends on: 5.1
- **5.4** depends on: none
- **5.5** depends on: 5.1, 5.4
- **6.1** depends on: Epic 2
- **6.2** depends on: 6.1
- **6.3** depends on: Epic 2
- **7.1** depends on: Epic 2
- **7.2** depends on: 7.1
- **re-1.1** depends on: none
- **re-1.2** depends on: none
- **re-1.3** depends on: none
- **re-2.1** depends on: none
- **re-2.2** depends on: re-1.1, re-2.1
- **re-2.3** depends on: none
- **re-3.1** depends on: re-2.1, re-2.2, re-2.3, re-5.1
- **re-3.2** depends on: re-3.1
- **re-4.1** depends on: none
- **re-5.1** depends on: none
- **re-6.1** depends on: RE-1
- **re-7.1** depends on: re-1.3, RE-2

## Notes

- **Epic 1 fully complete** — all stories (1.1-1.4) merged into master.
- **Epic 2 fully complete** — 2.1 + 2.2 + 2.3 + 2.4 done. 2.4 (PR #56) merged.
- **Epic 3 fully complete** — 3.1 + 3.2 + 3.3 done. 3.3 (PR #58) merged.
- **Epic 4 fully done** — 4.1 + 4.2 + 4.3 (PR #60) + 4.4 (PR #61) all merged to master.
- **Epic 5 in-progress** — 5.1 done, 5.2 done (PR #64), 5.3 blocked externally (unblocked dependency-wise), 5.4 done (PR #63, issue #65), 5.5 done (PR #67 merged, issue #66).
- **Epic 6 fully done** — 6.1 (PR #69), 6.2 (PR #70), 6.3 (PR #68) all merged to master.
- **Epic 7 fully done** — 7.1 (PR #71) merged. 7.2 (PR #72) merged.
- **RE-* epics are separate track** — recommendation engine independent of voice calling (Epics 2-7). Only depends on Epic 1 (auth/session, done).
- **RE-1 in-progress** — re-1.1 (PR #73) merged. re-1.2 and re-1.3 ready for dev.
- **max_parallel_stories=1**
- Default branch: `master`
