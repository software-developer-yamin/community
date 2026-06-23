# Story Dependency Graph
_Last updated: 2026-06-23T18:55:00+06:00_

## Stories

| Story | Epic | Title | Sprint Status | Issue | PR | PR Status | Dependencies | Ready to Work |
|-------|------|-------|--------------|-------|----|-----------|--------------|---------------|
| 1.1 | 1 | Persistent Session with Secure Storage | done | #1 | — | — | none | ✅ Yes (done) |
| 1.2 | 1 | Silent Token Refresh | done | #2 | #39 | merged | 1.1 | ✅ Yes (done) |
| 1.3 | 1 | Phone Number Auth (OTP) | done | #3 | #40 | merged | 1.1 | ✅ Yes (done) |
| 1.4 | 1 | Google OAuth Integration | done | #4 | #41 | merged | 1.1 | ✅ Yes (done) |
| 2.1 | 2 | Server-Managed Room Lifecycle | done | #5 | — | — | Epic 1 | ✅ Yes (done) |
| 2.2 | 2 | ICE Restart Reconnection (1-5s Blips) | done | #6 | #42 | merged | 2.1 | ✅ Yes (done) |
| 2.3 | 2 | Full Reconnection (5-30s Blips) | done | #7 | #55 | merged | 2.2 | ✅ Yes (done) |
| 2.4 | 2 | Explicit Call End | done | #8 | #56 | merged | 2.2 | ✅ Yes (done) |
| 3.1 | 3 | Gender Filter Enforcement | done | #9 | — | — | Epic 1 | ✅ Yes (done) |
| 3.2 | 3 | Native Language Field | done | #10 | #57 | merged | Epic 1 | ✅ Yes (done) |
| 3.3 | 3 | Match Timeout with Honest State | done | #11 | #58 | merged | Epic 1, 2.1 | ✅ Yes (done) |
| 4.1 | 4 | Graduated Strike System | backlog | #12 | — | — | Epic 2 | ✅ Yes |
| 4.2 | 4 | Skip Button (In-Call Action) | backlog | #13 | — | — | Epic 2 | ✅ Yes |
| 4.3 | 4 | Distinguish Victim from Aggressor | backlog | #14 | — | — | 4.1 | ❌ No (4.1 not done) |
| 4.4 | 4 | Visible Moderation State | backlog | #15 | — | — | 4.1 | ❌ No (4.1 not done) |
| 5.1 | 5 | Visible Subscription State | backlog | #16 | — | — | none (epic ordering) | ❌ No (epic 4 not complete) |
| 5.2 | 5 | In-App Support Ticket | backlog | #17 | — | — | none (epic ordering) | ❌ No (epic 4 not complete) |
| 5.3 | 5 | Refund Mechanism | backlog | #18 | — | — | 5.1 | ❌ No (epic 4, 5.1) |
| 6.1 | 6 | State Preservation Across Backgrounding | backlog | #19 | — | — | Epic 2 | ❌ No (epic 4-5 not complete) |
| 6.2 | 6 | Crash Resilience | backlog | #20 | — | — | 6.1 | ❌ No (epic 4-5, 6.1) |
| 6.3 | 6 | Reinstall Account Preservation | backlog | #36 | — | — | Epic 2 | ❌ No (epic 4-5 not complete) |
| 7.1 | 7 | Post-Call Rating Flow | backlog | #37 | — | — | Epic 2 | ❌ No (epic 4-6 not complete) |
| 7.2 | 7 | Rating Integration with Matching | backlog | #38 | — | — | 7.1 | ❌ No (epic 4-6, 7.1) |
| re-1.1 | RE-1 | Update Content Item | backlog | #43 | — | — | Epic 1 | ❌ No (epic 4-7 not complete) |
| re-1.2 | RE-1 | Bulk Content Import | backlog | #44 | — | — | re-1.1 | ❌ No (epic 4-7) |
| re-1.3 | RE-1 | Secure Content Creation | backlog | #45 | — | — | re-1.2 | ❌ No (epic 4-7) |
| re-2.1 | RE-2 | Compute Content Embedding on Creation | backlog | #46 | — | — | Epic 1 | ❌ No (epic 4-7) |
| re-2.2 | RE-2 | Recompute Content Embedding on Update | backlog | #47 | — | — | re-2.1 | ❌ No (epic 4-7) |
| re-2.3 | RE-2 | Real Profile Embeddings from User Data | backlog | #48 | — | — | re-2.1 | ❌ No (epic 4-7) |
| re-3.1 | RE-3 | Native Mobile Recommendation Feed (Expo) | backlog | #49 | — | — | Epic 1 | ❌ No (epic 4-7) |
| re-3.2 | RE-3 | Recommendation Feed Empty State Design | backlog | #50 | — | — | re-3.1 | ❌ No (epic 4-7) |
| re-4.1 | RE-4 | Interaction-Weighted Scoring (v2) | backlog | #51 | — | — | re-2.2, re-2.3, re-3.2 | ❌ No (epic 4-7) |
| re-5.1 | RE-5 | User Preferences Native UI | backlog | #52 | — | — | re-1.3 | ❌ No (epic 4-7) |
| re-6.1 | RE-6 | Admin Content Analytics | backlog | #53 | — | — | re-5.1 | ❌ No (epic 4-7) |
| re-7.1 | RE-7 | Secure Seed Endpoint for Production | backlog | #54 | — | — | re-6.1 | ❌ No (epic 4-7) |

## Dependency Chains

- **1.2** depends on: 1.1
- **1.3** depends on: 1.1
- **1.4** depends on: 1.1
- **2.1** depends on: Epic 1 (all stories done)
- **2.2** depends on: 2.1
- **2.3** depends on: 2.2
- **2.4** depends on: 2.2
- **3.1** depends on: Epic 1
- **3.2** depends on: Epic 1
- **3.3** depends on: Epic 1, 2.1
- **4.1** depends on: Epic 2
- **4.2** depends on: Epic 2
- **4.3** depends on: 4.1
- **4.4** depends on: 4.1
- **5.3** depends on: 5.1
- **6.2** depends on: 6.1
- **7.2** depends on: 7.1
- **re-1.2** depends on: re-1.1
- **re-1.3** depends on: re-1.2
- **re-2.2** depends on: re-2.1
- **re-2.3** depends on: re-2.1
- **re-3.2** depends on: re-3.1
- **re-4.1** depends on: re-2.2, re-2.3, re-3.2
- **re-5.1** depends on: re-1.3
- **re-6.1** depends on: re-5.1
- **re-7.1** depends on: re-6.1

## Ready to Work

Rules: a story is Ready to Work when:
1. Every story it depends on has a merged PR (or is done, treated as merged)
2. Every story in all lower-numbered epic numbers has a merged PR (or is done)

### Ready Stories (by priority)

| Rank | Story | Epic | Title | Why Ready |
|------|-------|------|-------|-----------|
| 1 | **4.1** | Epic 4 | Graduated Strike System | Depends on Epic 2 (done). Epics 1-3 fully complete. |
| 2 | **4.2** | Epic 4 | Skip Button (In-Call Action) | Depends on Epic 2 (done). Can be done in parallel with 4.1. |

### Partially Ready (waiting on prerequisites)

| Story | Epic | Blocked By |
|-------|------|------------|
| 4.3 | Epic 4 | 4.1 not done |
| 4.4 | Epic 4 | 4.1 not done |

## Notes

- **Story 1.1** was completed manually (outside BAD pipeline): code exists, configs verified. No PR was created. Treated as completed for dependency purposes.
- **Story 2.1** was completed as infrastructure work without a separate BAD PR.
- **Story 3.1** was completed inline without a separate BAD PR.
- **MAX_PARALLEL_STORIES=1**, so only one story will be picked per batch.
- Epic 1 (Auth) fully complete — 1.2 (PR #39), 1.3 (PR #40), 1.4 (PR #41) merged into master.
- Epic 2 (Call Reliability) fully complete — 2.2 (PR #42), 2.3 (PR #55), 2.4 (PR #56) merged into master.
- Epic 3 (Matchmaking) fully complete — 3.2 (PR #57), 3.3 (PR #58) merged into master.
- **Epics 1-3 done → Epic 4 (Moderation & Trust System) is the next epic.**
- **SOLO_MODE=true**, so coordinator executes all steps inline.

[#1]: https://github.com/software-developer-yamin/community/issues/1
[#2]: https://github.com/software-developer-yamin/community/issues/2
[#3]: https://github.com/software-developer-yamin/community/issues/3
[#4]: https://github.com/software-developer-yamin/community/issues/4
[#5]: https://github.com/software-developer-yamin/community/issues/5
[#6]: https://github.com/software-developer-yamin/community/issues/6
[#7]: https://github.com/software-developer-yamin/community/issues/7
[#8]: https://github.com/software-developer-yamin/community/issues/8
[#9]: https://github.com/software-developer-yamin/community/issues/9
[#10]: https://github.com/software-developer-yamin/community/issues/10
[#11]: https://github.com/software-developer-yamin/community/issues/11
[#12]: https://github.com/software-developer-yamin/community/issues/12
[#13]: https://github.com/software-developer-yamin/community/issues/13
[#14]: https://github.com/software-developer-yamin/community/issues/14
[#15]: https://github.com/software-developer-yamin/community/issues/15
[#16]: https://github.com/software-developer-yamin/community/issues/16
[#17]: https://github.com/software-developer-yamin/community/issues/17
[#18]: https://github.com/software-developer-yamin/community/issues/18
[#19]: https://github.com/software-developer-yamin/community/issues/19
[#20]: https://github.com/software-developer-yamin/community/issues/20
[#36]: https://github.com/software-developer-yamin/community/issues/36
[#37]: https://github.com/software-developer-yamin/community/issues/37
[#38]: https://github.com/software-developer-yamin/community/issues/38
[#39]: https://github.com/software-developer-yamin/community/pull/39
[#40]: https://github.com/software-developer-yamin/community/pull/40
[#41]: https://github.com/software-developer-yamin/community/pull/41
[#42]: https://github.com/software-developer-yamin/community/pull/42
[#43]: https://github.com/software-developer-yamin/community/issues/43
[#44]: https://github.com/software-developer-yamin/community/issues/44
[#45]: https://github.com/software-developer-yamin/community/issues/45
[#46]: https://github.com/software-developer-yamin/community/issues/46
[#47]: https://github.com/software-developer-yamin/community/issues/47
[#48]: https://github.com/software-developer-yamin/community/issues/48
[#49]: https://github.com/software-developer-yamin/community/issues/49
[#50]: https://github.com/software-developer-yamin/community/issues/50
[#51]: https://github.com/software-developer-yamin/community/issues/51
[#52]: https://github.com/software-developer-yamin/community/issues/52
[#53]: https://github.com/software-developer-yamin/community/issues/53
[#54]: https://github.com/software-developer-yamin/community/issues/54
[#55]: https://github.com/software-developer-yamin/community/pull/55
[#56]: https://github.com/software-developer-yamin/community/pull/56
[#57]: https://github.com/software-developer-yamin/community/pull/57
[#58]: https://github.com/software-developer-yamin/community/pull/58
