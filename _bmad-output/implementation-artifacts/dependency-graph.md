# Story Dependency Graph
_Last updated: 2026-06-16T12:00:00+06:00_

## Stories

| Story | Epic | Title | Sprint Status | Issue | PR | PR Status | Dependencies | Ready to Work |
|-------|------|-------|--------------|-------|----|-----------|--------------|---------------|
| 1.1 | 1 | Persistent Session with Secure Storage | backlog | #1 | — | — | none | ✅ Yes |
| 1.2 | 1 | Silent Token Refresh | backlog | #2 | — | — | 1.1 | ❌ No (1.1 not merged) |
| 1.3 | 1 | Phone Number Authentication with OTP | backlog | #3 | — | — | 1.1 | ❌ No (1.1 not merged) |
| 1.4 | 1 | Google OAuth Integration | backlog | #4 | — | — | 1.1 | ❌ No (1.1 not merged) |
| 2.1 | 2 | Server-Managed Room Lifecycle | backlog | #5 | — | — | Epic 1 | ❌ No (epic 1 not complete) |
| 2.2 | 2 | ICE Restart Reconnection (1-5s Blips) | backlog | #6 | — | — | 2.1 | ❌ No (2.1 not merged) |
| 2.3 | 2 | Full Reconnection (5-30s Blips) | backlog | #7 | — | — | 2.1 | ❌ No (2.1 not merged) |
| 2.4 | 2 | Explicit Call End | backlog | #8 | — | — | 2.1 | ❌ No (2.1 not merged) |
| 3.1 | 3 | Gender Filter Enforcement | backlog | #9 | — | — | Epic 1 | ❌ No (epic 1 not complete) |
| 3.2 | 3 | Native Language Field | backlog | #10 | — | — | Epic 1 | ❌ No (epic 1 not complete) |
| 3.3 | 3 | Match Timeout with Honest State | backlog | #11 | — | — | 3.1, 3.2 | ❌ No (epic 1 not complete) |
| 4.1 | 4 | Graduated Strike System | backlog | #12 | — | — | Epic 2 | ❌ No (epic 1 not complete) |
| 4.2 | 4 | Skip Button (In-Call Action) | backlog | #13 | — | — | Epic 2 | ❌ No (epic 1 not complete) |
| 4.3 | 4 | Distinguish Victim from Aggressor | backlog | #14 | — | — | 4.1 | ❌ No (epic 1 not complete) |
| 4.4 | 4 | Visible Moderation State | backlog | #15 | — | — | 4.1 | ❌ No (epic 1 not complete) |
| 5.1 | 5 | Visible Subscription State | backlog | #16 | — | — | none | ❌ No (epic 1 not complete — epic ordering) |
| 5.2 | 5 | In-App Support Ticket | backlog | #17 | — | — | none | ❌ No (epic 1 not complete — epic ordering) |
| 5.3 | 5 | Refund Mechanism | backlog | #18 | — | — | 5.1 | ❌ No (epic 1 not complete) |
| 6.1 | 6 | State Preservation Across Backgrounding | backlog | #19 | — | — | Epic 1 | ❌ No (epic 1 not complete) |
| 6.2 | 6 | Crash Resilience | backlog | #20 | — | — | Epic 1 | ❌ No (epic 1 not complete) |
| 6.3 | 6 | Reinstall Account Preservation | backlog | #36 | — | — | Epic 1 | ❌ No (epic 1 not complete) |
| 7.1 | 7 | Post-Call Rating Flow | backlog | #37 | — | — | Epic 2 | ❌ No (epic 1 not complete) |
| 7.2 | 7 | Rating Integration with Matching | backlog | #38 | — | — | 7.1 | ❌ No (epic 1 not complete) |

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

- **Epic 1 must complete before any other epic** — auth foundation is required for everything
- Story **1.1** is the only currently ready story — no dependencies, lowest epic
- `max_parallel_stories=1` so stories run one at a time
- Default branch is `master` (not `main`) — all git operations must target `master`
