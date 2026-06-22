# Dependency Graph

_Generated: 2026-06-23_
_Repo: `software-developer-yamin/community`_
_Default branch: `master`_
_Baseline commit: `81cc3c8205585c1852037ba57f59796698e7daa4`_

---

## Epic → Story Mapping

### Epic 1: Authentication & Trust (done)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 1.1 | persistent-session-with-secure-storage | [#1][i1] | — | **done** (manual) | — |
| 1.2 | silent-token-refresh | [#2][i2] | — | **done** | 1.1 |
| 1.3 | phone-number-authentication-with-otp | [#3][i3] | — | **done** | 1.1 |
| 1.4 | google-oauth-integration | [#4][i4] | — | **done** | 1.1 |

### Epic 2: Call Reliability & Reconnection (done)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 2.1 | server-managed-room-lifecycle | [#5][i5] | — | **done** | Epic 1 |
| 2.2 | ice-restart-reconnection-1-5s-blips | [#6][i6] | [#42][p42] | **done** | 2.1 |
| 2.3 | full-reconnection-5-30s-blips | [#7][i7] | [#55][p55] | **done** | 2.2 |
| 2.4 | explicit-call-end | [#8][i8] | [#56][p56] | **done** | 2.2 |

### Epic 3: Matchmaking & Filtering (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 3.1 | gender-filter-enforcement | [#9][i9] | — | backlog | Epic 1 |
| 3.2 | native-language-field | [#10][i10] | — | backlog | Epic 1 |
| 3.3 | match-timeout-with-honest-state | [#11][i11] | — | backlog | Epic 1, 2.1 |

### Epic 4: Moderation & Trust System (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 4.1 | graduated-strike-system | [#12][i12] | — | backlog | Epic 2 |
| 4.2 | skip-button-in-call-action | [#13][i13] | — | backlog | Epic 2 |
| 4.3 | distinguish-victim-from-aggressor | [#14][i14] | — | backlog | 4.1 |
| 4.4 | visible-moderation-state | [#15][i15] | — | backlog | 4.1 |

### Epic 5: Billing, Support & Refund Transparency (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 5.1 | visible-subscription-state | [#16][i16] | — | backlog | none (epic ordering) |
| 5.2 | in-app-support-ticket | [#17][i17] | — | backlog | none (epic ordering) |
| 5.3 | refund-mechanism | [#18][i18] | — | backlog | 5.1 |

### Epic 6: Mobile Stability & State Preservation (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 6.1 | state-preservation-across-backgrounding | [#19][i19] | — | backlog | Epic 2 |
| 6.2 | crash-resilience | [#20][i20] | — | backlog | 6.1 |
| 6.3 | reinstall-account-preservation | [#36][i36] | — | backlog | Epic 2 |

### Epic 7: Post-Call Rating & Quality (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 7.1 | post-call-rating-flow | [#37][i37] | — | backlog | Epic 2 |
| 7.2 | rating-integration-with-matching | [#38][i38] | — | backlog | 7.1 |

### Epic RE: Recommendation Engine (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| re-1.1 | real-user-auth-for-match-scoring | [#24][i24] | — | backlog | Epic 1 |
| re-1.2 | match-score-persistence-db-write | [#25][i25] | — | backlog | re-1.1 |
| re-1.3 | historical-score-analysis-for-recs | [#26][i26] | — | backlog | re-1.2 |
| re-2.1 | parse-call-session-history | [#27][i27] | — | backlog | Epic 1 |
| re-2.2 | duration-based-user-scoring | [#28][i28] | — | backlog | re-2.1 |
| re-2.3 | end-reason-based-user-scoring | [#29][i29] | — | backlog | re-2.1 |
| re-3.1 | user-embedding-storage-in-db | [#30][i30] | — | backlog | Epic 1 |
| re-3.2 | semantic-similarity-score-in-matchmaking | [#31][i31] | — | backlog | re-3.1 |
| re-4.1 | scoring-weight-configuration | [#32][i32] | — | backlog | re-2.2, re-2.3, re-3.2 |
| re-5.1 | data-freshness-check | [#33][i33] | — | backlog | re-1.3 |
| re-6.1 | fallback-to-code-free-rules | [#34][i34] | — | backlog | re-5.1 |
| re-7.1 | recommendation-engine-metrics-collection | [#35][i35] | — | backlog | re-6.1 |

---

## Ready to Work

Rules: a story is Ready to Work when:
1. Every story it depends on has a merged PR (or is done outside BAD, treated as merged)
2. Every story in all lower-numbered epics has a merged PR (or is done outside BAD)

### Ready Stories (by priority)

| Rank | Story | Slug | Epic | Why Ready |
|------|-------|------|------|-----------|
| 1 | **3.1** | gender-filter-enforcement | Epic 3 | Depends on Epic 1 (done). Epics 1-2 fully complete. |
| 2 | 3.2 | native-language-field | Epic 3 | Depends on Epic 1 (done). Epics 1-2 fully complete. |
| 3 | 3.3 | match-timeout-with-honest-state | Epic 3 | Depends on 3.1, 3.2 (ready after those done). |

### Notes

- **Story 1.1** was completed manually (outside BAD pipeline): code exists, configs verified. No PR was created. Treated as completed for dependency purposes.
- **Story 2.1** was marked done while 1.3/1.4 were still in-review — dependency on Epic 1 satisfied by core auth foundation (1.1, 1.2).
- **MAX_PARALLEL_STORIES=1**, so only one story will be picked per batch.
- Epic 1 (Auth) fully complete — 1.3 and 1.4 merged into master.
- Epic 2 (Call Reliability) fully complete — 2.3 (PR #55) and 2.4 (PR #56) merged into master.
- Epics 1-2 done → Epics 3-7 now unblocked.
- Epic 3 (Matchmaking) is the next epic in sequence.

---

[i1]: https://github.com/software-developer-yamin/community/issues/1
[i2]: https://github.com/software-developer-yamin/community/issues/2
[i3]: https://github.com/software-developer-yamin/community/issues/3
[i4]: https://github.com/software-developer-yamin/community/issues/4
[i5]: https://github.com/software-developer-yamin/community/issues/5
[i6]: https://github.com/software-developer-yamin/community/issues/6
[i7]: https://github.com/software-developer-yamin/community/issues/7
[i8]: https://github.com/software-developer-yamin/community/issues/8
[i9]: https://github.com/software-developer-yamin/community/issues/9
[i10]: https://github.com/software-developer-yamin/community/issues/10
[i11]: https://github.com/software-developer-yamin/community/issues/11
[i12]: https://github.com/software-developer-yamin/community/issues/12
[i13]: https://github.com/software-developer-yamin/community/issues/13
[i14]: https://github.com/software-developer-yamin/community/issues/14
[i15]: https://github.com/software-developer-yamin/community/issues/15
[i16]: https://github.com/software-developer-yamin/community/issues/16
[i17]: https://github.com/software-developer-yamin/community/issues/17
[i18]: https://github.com/software-developer-yamin/community/issues/18
[i19]: https://github.com/software-developer-yamin/community/issues/19
[i20]: https://github.com/software-developer-yamin/community/issues/20
[i21]: https://github.com/software-developer-yamin/community/issues/21
[i22]: https://github.com/software-developer-yamin/community/issues/22
[i23]: https://github.com/software-developer-yamin/community/issues/23
[i24]: https://github.com/software-developer-yamin/community/issues/24
[i25]: https://github.com/software-developer-yamin/community/issues/25
[i26]: https://github.com/software-developer-yamin/community/issues/26
[i27]: https://github.com/software-developer-yamin/community/issues/27
[i28]: https://github.com/software-developer-yamin/community/issues/28
[i29]: https://github.com/software-developer-yamin/community/issues/29
[i30]: https://github.com/software-developer-yamin/community/issues/30
[i31]: https://github.com/software-developer-yamin/community/issues/31
[i32]: https://github.com/software-developer-yamin/community/issues/32
[i33]: https://github.com/software-developer-yamin/community/issues/33
[i34]: https://github.com/software-developer-yamin/community/issues/34
[i35]: https://github.com/software-developer-yamin/community/issues/35
[i36]: https://github.com/software-developer-yamin/community/issues/36
[i37]: https://github.com/software-developer-yamin/community/issues/37
[i38]: https://github.com/software-developer-yamin/community/issues/38
[p42]: https://github.com/software-developer-yamin/community/pull/42
[p55]: https://github.com/software-developer-yamin/community/pull/55
[p56]: https://github.com/software-developer-yamin/community/pull/56
