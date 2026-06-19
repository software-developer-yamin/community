# Story Dependency Graph
_Last updated: 2026-06-20T12:00:00+06:00_

## Stories

| Story | Epic | Title | Sprint Status | Issue | PR | PR Status | Dependencies | Ready to Work |
|-------|------|-------|--------------|-------|----|-----------|--------------|---------------|
| 1.1 | 1 | Persistent Session with Secure Storage | done | #1 | — | — | none | ✅ Yes (done) |
| 1.2 | 1 | Silent Token Refresh | done | #2 | — | — | 1.1 | ✅ Yes (done) |
| 1.3 | 1 | Phone Number Authentication with OTP | done | #3 | — | — | 1.1 | ✅ Yes (done) |
| 1.4 | 1 | Google OAuth Integration | done | #4 | — | — | 1.1 | ✅ Yes (done) |
| 2.1 | 2 | Server-Managed Room Lifecycle | done | #5 | — | — | Epic 1 | ✅ Yes (done) |
| 2.2 | 2 | ICE Restart Reconnection (1-5s Blips) | done | #6 | #42 | merged | 2.1 | ✅ Yes (done) |
| 2.3 | 2 | Full Reconnection (5-30s Blips) | backlog | #7 | — | — | 2.2 | ❌ No (2.2 not done) |
| 2.4 | 2 | Explicit Call End | backlog | #8 | — | — | 2.2 | ❌ No (2.2 not done) |
| 3.1 | 3 | Gender Filter Enforcement | backlog | #9 | — | — | Epic 1 | ✅ Yes (Epic 1 done) |
| 3.2 | 3 | Native Language Field | backlog | #10 | — | — | Epic 1 | ✅ Yes (Epic 1 done) |
| 3.3 | 3 | Match Timeout with Honest State | backlog | #11 | — | — | 3.1, 3.2 | ❌ No (3.1, 3.2 not done) |
| 4.1 | 4 | Graduated Strike System | backlog | #12 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 4.2 | 4 | Skip Button (In-Call Action) | backlog | #13 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 4.3 | 4 | Distinguish Victim from Aggressor | backlog | #14 | — | — | 4.1 | ❌ No (Epic 2 not done) |
| 4.4 | 4 | Visible Moderation State | backlog | #15 | — | — | 4.1 | ❌ No (Epic 2 not done) |
| 5.1 | 5 | Visible Subscription State | backlog | #16 | — | — | none | ❌ No (epic ordering — Epic 2 not done) |
| 5.2 | 5 | In-App Support Ticket | backlog | #17 | — | — | none | ❌ No (epic ordering — Epic 2 not done) |
| 5.3 | 5 | Refund Mechanism | backlog | #18 | — | — | 5.1 | ❌ No (epic ordering) |
| 6.1 | 6 | State Preservation Across Backgrounding | backlog | #19 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 6.2 | 6 | Crash Resilience | backlog | #20 | — | — | 6.1 | ❌ No (Epic 2 not done) |
| 6.3 | 6 | Reinstall Account Preservation | backlog | #36 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 7.1 | 7 | Post-Call Rating Flow | backlog | #37 | — | — | Epic 2 | ❌ No (Epic 2 not done) |
| 7.2 | 7 | Rating Integration with Matching | backlog | #38 | — | — | 7.1 | ❌ No (Epic 2 not done) |

## Dependency Chains

- **1.2** depends on: 1.1
- **1.3** depends on: 1.1
- **1.4** depends on: 1.1
- **2.1** depends on: Epic 1 (auth foundation)
- **2.2** depends on: 2.1
- **2.3** depends on: 2.1
- **2.4** depends on: 2.1
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
- **6.1** depends on: Epic 1
- **6.2** depends on: Epic 1
- **6.3** depends on: Epic 1
- **7.1** depends on: Epic 2
- **7.2** depends on: 7.1

## Notes

- **Epic 1 is fully complete** — all stories (1.1-1.4) merged into master.
- Epic 2+ is now unblocked: **2.2 is ready to work** (depends on 2.1 which is done).
- Story **1.1** was completed manually (outside BAD pipeline): code exists, configs verified. No PR was created. Treated as completed for dependency purposes.
- Story **2.1** was marked done while 1.3/1.4 were still in-review.
- `max_parallel_stories=1` so stories run one at a time
- Default branch is `master` — all git operations must target `master`
