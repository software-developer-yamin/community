# Story Dependency Graph
_Last updated: 2026-06-23T12:00:00+06:00_

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
| 3.1 | 3 | Gender Filter Enforcement | backlog | #9 | — | — | Epic 1 | ✅ Yes (Epic 1 done) |
| 3.2 | 3 | Native Language Field | backlog | #10 | — | — | Epic 1 | ✅ Yes (Epic 1 done) |
| 3.3 | 3 | Match Timeout with Honest State | backlog | #11 | — | — | 3.1, 3.2 | ❌ No (3.1, 3.2 not done) |
| 4.1 | 4 | Graduated Strike System | backlog | #12 | — | — | Epic 2 | ❌ No (Epic 2 not done — 2.3, 2.4 pending) |
| 4.2 | 4 | Skip Button (In-Call Action) | backlog | #13 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 4.3 | 4 | Distinguish Victim from Aggressor | backlog | #14 | — | — | 4.1 | ❌ No (Epic 2 not done) |
| 4.4 | 4 | Visible Moderation State | backlog | #15 | — | — | 4.1 | ❌ No (Epic 2 not done) |
| 5.1 | 5 | Visible Subscription State | backlog | #16 | — | — | none | ❌ No (epic ordering) |
| 5.2 | 5 | In-App Support Ticket | backlog | #17 | — | — | none | ❌ No (epic ordering) |
| 5.3 | 5 | Refund Mechanism | backlog | #18 | — | — | 5.1 | ❌ No (epic ordering) |
| 6.1 | 6 | State Preservation Across Backgrounding | backlog | #19 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 6.2 | 6 | Crash Resilience | backlog | #20 | — | — | 6.1 | ❌ No (Epic 2 not done) |
| 6.3 | 6 | Reinstall Account Preservation | backlog | #36 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 7.1 | 7 | Post-Call Rating Flow | backlog | #37 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 7.2 | 7 | Rating Integration with Matching | backlog | #38 | — | — | 7.1 | ❌ No (Epic 2 not done) |
| re-1.1 | RE-1 | Update Content Item | backlog | #43 | — | — | none | ✅ Yes |
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
- **5.1** depends on: none (blocked by epic ordering)
- **5.2** depends on: none (blocked by epic ordering)
- **5.3** depends on: 5.1
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
- **Epics 3-7 now unblocked** — Epics 1 and 2 fully done.
- **RE-* epics are separate track** — recommendation engine independent of voice calling (Epics 2-7). Only depends on Epic 1 (auth/session, done).
- **max_parallel_stories=1**
- Default branch: `master`
