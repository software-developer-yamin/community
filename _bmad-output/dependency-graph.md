# Dependency Graph

_Generated: 2026-06-18_
_Repo: `software-developer-yamin/community`_
_Default branch: `master`_
_Baseline commit: `81cc3c8205585c1852037ba57f59796698e7daa4`_

---

## Epic → Story Mapping

### Epic 1: Authentication & Trust (in-progress)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 1.1 | persistent-session-with-secure-storage | [#1][i1] | — | **done** (manual) | — |
| 1.2 | silent-token-refresh | [#2][i2] | — | backlog | 1.1 |
| 1.3 | phone-number-authentication-with-otp | [#3][i3] | — | backlog | 1.1 |
| 1.4 | google-oauth-integration | [#4][i4] | — | backlog | 1.1 |

### Epic 2: Call Stability & ICE (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 2.1 | server-managed-room-lifecycle | [#5][i5] | — | backlog | Epic 1 |
| 2.2 | ice-restart-reconnection-1-5s-blips | [#6][i6] | — | backlog | 2.1 |
| 2.3 | full-reconnection-5-30s-blips | [#7][i7] | — | backlog | 2.2 |
| 2.4 | explicit-call-end | [#8][i8] | — | backlog | 2.2 |

### Epic 3: Moderation & Safety (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 3.1 | gender-filter-enforcement | [#9][i9] | — | backlog | Epic 1 |
| 3.2 | native-language-field | [#10][i10] | — | backlog | Epic 1 |
| 3.3 | match-timeout-with-honest-state | [#11][i11] | — | backlog | Epic 1, 2.1 |
| 3.4 | graduated-strike-system | [#12][i12] | — | backlog | Epic 1 |

### Epic 4: In-Call UX (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 4.1 | skip-button-in-call-action | [#13][i13] | — | backlog | Epic 2, 3.1-3.2 |
| 4.2 | distinguish-victim-from-aggressor | [#14][i14] | — | backlog | 3.4 |
| 4.3 | visible-moderation-state | [#15][i15] | — | backlog | 4.1-4.2 |
| 4.4 | visible-subscription-state | [#16][i16] | — | backlog | 5.1 |

### Epic 5: Subscriptions & Support (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 5.1 | in-app-support-ticket | [#17][i17] | — | backlog | Epic 1 |
| 5.2 | refund-mechanism | [#18][i18] | — | backlog | Epic 1, 5.1 |
| 5.3 | visible-moderation-state | [#15][i15] | — | backlog | Epic 2, Epic 4 |

### Epic 6: Multi-Session & Resilience (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 6.1 | state-preservation-across-backgrounding | [#19][i19] | — | backlog | Epic 2 |
| 6.2 | crash-resilience | [#20][i20] | — | backlog | 6.1 |
| 6.3 | websocket-reconnection-state-sync | [#21][i21] | — | backlog | Epic 2 |

### Epic 7: Observability & Analytics (backlog)

| Story | Slug | GH Issue | PR | Status | Depends On |
|-------|------|----------|----|--------|------------|
| 7.1 | anonymous-analytics | [#22][i22] | — | backlog | Epic 1 |
| 7.2 | observability-for-critical-paths | [#23][i23] | — | backlog | 7.1, Epic 2 |
| 7.3 | rating-integration-with-matching | [#38][i38] | — | backlog | Epic 2 |
| 7.4 | post-call-rating-flow | [#37][i37] | — | backlog | Epic 4 |

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
| 1 | **1.2** | silent-token-refresh | Epic 1 | Depends on 1.1 (done manual) |
| 2 | **1.3** | phone-number-authentication-with-otp | Epic 1 | Depends on 1.1 (done manual) |
| 3 | **1.4** | google-oauth-integration | Epic 1 | Depends on 1.1 (done manual) |

### Notes

- **Story 1.1** was completed manually (outside BAD pipeline): code exists, configs verified. No PR was created. Treated as completed for dependency purposes.
- **MAX_PARALLEL_STORIES=1**, so only one story will be picked per batch.
- **Auto-merge (AUTO_PR_MERGE=true)**: PRs merge sequentially as they pass review.
- Epic 2+ are BLOCKED until all Epic 1 stories are completed through BAD.

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
