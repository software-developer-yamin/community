# Agent Frameworks — install, upgrade, usage

Three agent-workflow frameworks wired into **opencode**. All commands verified on this
machine (opencode 1.18.35, node v22.22.0, uv 0.12.23).

| Framework | Scope | What it gives you |
|---|---|---|
| [BMAD Method](#bmad-method) | this repo (`_bmad/`) | Full product-delivery lifecycle: PRD → epics → sprint → build → review |
| [Superpowers](#superpowers) | global (opencode plugin) | Behavioral discipline: brainstorm-before-code, TDD, verify-before-done |
| [mattpocock/skills](#mattpocock-skills) | global (`~/.agents/skills/`) | Planning + code-quality workflow: spec → tickets → implement → review |

Current state: **BMAD 6.12.1**, **Superpowers v6.4.2**, **mattpocock/skills 38 skills**.

---

## BMAD Method

Agile AI-Driven Development. Module-based: you install the modules you need, and
their skills land in every configured IDE's skills directory.

### Verify

```bash
grep -m1 'version:' _bmad/_config/manifest.yaml     # → 6.12.1
ls .claude/skills | grep -c '^bmad-'                # → 49 bmad-* skills
```

Each configured IDE gets 64 BMAD skills: 49 `bmad-*` plus module-prefixed ones
(`wds-*` from WDS, `memory`, `sync`).

Installed modules: `core` 6.12.1, `bmm` 6.12.1, `cis` v0.3.2, `tea` v1.27.2, `wds` v0.4.3.
Configured IDEs: `claude-code`, `github-copilot`, `antigravity`, `hermes`, `opencode`.

### Upgrade

```bash
npx bmad-method install                     # interactive
npx bmad-method install --action update --yes --all-stable --no-shims
```

Fully non-interactive (this is what was used here):

```bash
npx bmad-method install \
  --action update --yes --all-stable --no-shims \
  --directory "/home/yamin/Documents/Yamin Portfolio/community" \
  --tools claude-code,github-copilot,antigravity,hermes,opencode
```

> The installer prompts for the install directory even with `--yes`. Pipe newlines
> (`printf '\n' | npx bmad-method install …`) or pass `--directory` explicitly.

Useful flags: `--modules bmm,tea`, `--list-tools`, `--list-options`, `--shims` /
`--no-shims`, `--user-name`, `--custom-source`, `--pin CODE=TAG`.
Bare `npx bmad-method` picks up npm `latest` (6.12.1); `@next` tracks v7 pre-release.

### What it will not clobber

- `_bmad/custom/` — never touched. Put durable config overrides here.
- `_bmad-output/` — your artifacts (PRDs, epics, sprint status, project-context.md).
- Hand-edited installer files — restored as `<path>.bak`.
- `_bmad/config.toml` — regenerated every install; prior answers are remembered as
  defaults. Its header says treat as read-only.

On this upgrade: 11 custom files preserved, 4 deprecated shim skills removed, 0 `.bak`
files needed (nothing hand-edited).

### Usage

Start every session with `bmad-help`. It reads the project, detects installed modules,
and prints the next step in priority order with the command to run.

Planning chain:

| Skill | Use for |
|---|---|
| `bmad-help` | **Start here.** Orientation + next step |
| `bmad-brainstorming` | Ideation before any commitment → `brainstorm.html` |
| `bmad-prfaq` | Working-backwards PRFAQ stress test |
| `bmad-product-brief` | Create/update/validate a product brief |
| `bmad-prd` | Create / update / validate a PRD (state which intent) |
| `bmad-spec` | Condense input into a short buildable spec |
| `bmad-ux` | UX vision → `DESIGN.md` + `EXPERIENCE.md` |
| `bmad-architecture` | Architecture spine (design decisions + rationale) |
| `bmad-deep-recon` | Research: market / domain / technical |
| `bmad-create-epics-and-stories` | Requirements → epics + user stories |
| `bmad-sprint-planning` | Readiness gate (PASS/CONCERNS/FAIL) + sprint status |
| `bmad-correct-course` | Propose a mid-sprint change |

Building:

| Skill | Use for |
|---|---|
| `bmad-build` | **Main event.** Work item → working code, reviewed + verified |
| `bmad-build-auto` | One iteration of an unattended build loop |
| `bmad-code-review` | Parallel reviewers → triaged findings |
| `bmad-walkthrough` | Human review of a commit/PR, block by block |
| `bmad-review` | Multi-lens review (adversarial, edge-case, prose, structure) |
| `bmad-project-context` | Set up / refresh `AGENTS.md` for the repo |
| `bmad-qa-generate-e2e-tests` | Generate API + E2E tests |
| `bmad-retrospective` | Post-epic review against evidence |

Persona agents — invoke the skill, then type a menu code:
`bmad-agent-analyst` (Mary), `bmad-agent-pm` (John), `bmad-agent-architect` (Winston),
`bmad-agent-dev` (Amelia), `bmad-agent-ux-designer` (Sally).

Team workflow: `bmad-party-mode` (multi-agent roundtable), `bmad-forge-idea`
(pressure-test until it hardens or dies), `bmad-advanced-elicitation`
(force a named reasoning method on the last output), `bmad-customize`
(write `_bmad/custom/` overrides without hand-authoring TOML).

### Renamed in 6.11–6.12 (old name → current)

| Old | Current |
|---|---|
| `bmad-quick-dev` | `bmad-build` |
| `bmad-dev-auto` | `bmad-build-auto` |
| `bmad-create-architecture` | `bmad-architecture` |
| `bmad-market-research`, `bmad-domain-research`, `bmad-technical-research` | `bmad-deep-recon` |
| `bmad-document-project`, `bmad-generate-project-context` | `bmad-project-context` |
| `bmad-review-adversarial-general`, `bmad-review-edge-case-hunter` | `bmad-review` |
| `bmad-checkpoint-preview` | `bmad-walkthrough` |
| `bmad-sprint-status` | `bmad-sprint-planning` |
| `bmad-create-story`, `bmad-dev-story` | superseded by sprint-planning → build → code-review |

Removed outright: `bmad-index-docs`, `bmad-shard-doc`,
`bmad-check-implementation-readiness`, `bmad-investigate`, `bmad-agent-tech-writer`.

### Gotchas

- **`uv` is required.** `bmad-build` / `bmad-build-auto` halt without it
  (`uv run` provisions its own interpreter). Present here: 0.12.23.
- **`wds` is deprecated** upstream. Existing installs keep it and it keeps working, but
  it warns on every flow and is hidden from the picker on fresh installs.
- Do **not** jump to v7 (`@next`) on this repo. v7 stops reading
  `planning_artifacts` / `implementation_artifacts` (this repo has 179 tracked files
  under `_bmad-output/`) and needs `bmad migrate method` first.
- Git tag `bmad-pre-upgrade-6.9.0` marks the pre-upgrade commit if you need to roll back.

---

## Superpowers

Behavioral discipline layer — forces the model to brainstorm before creative work,
write a plan before touching code, TDD before implementation, and gather evidence
before claiming done. 15 skills, all model-invoked (no slash commands since v6.0).

### Install (opencode)

Already configured in `~/.config/opencode/opencode.json`:

```json
"plugin": ["superpowers@git+https://github.com/obra/superpowers.git#v6.4.2"]
```

opencode **1.x** uses the `plugin` key; 2.0.4+ uses `plugins`. Verified against
<https://opencode.ai/config.json>. Pinned to a tag for reproducibility. Restart
opencode — config is read once at startup.

opencode clones the plugin into `~/.cache/opencode/packages/` on first load and runs
`.opencode/plugins/superpowers.js`, which registers the 15 skills and the session-start
hook. Nothing else to do.

### Verify

```bash
opencode debug skill | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(len([x for x in d if 'superpowers' in (x.get('location') or '')]), 'superpowers skills')"
# → 15 superpowers skills
```

Then start a fresh session and ask for a small feature — `brainstorming` should fire
before any code is written. If it doesn't, the session-start hook didn't run.

### Usage

Auto-triggered. `using-superpowers` installs itself at session start and instructs the
model to invoke a relevant skill if there is even a 1% chance one applies. In opencode
the skills are unnamespaced — invoke `brainstorming`, not `superpowers:brainstorming`.

Canonical order:

```
brainstorming → using-git-worktrees → writing-plans
  → (subagent-driven-development | executing-plans)
  → test-driven-development → requesting-code-review
  → finishing-a-development-branch
```

The `subagent-driven-development` vs `executing-plans` split is the cost dial:
SDD dispatches a fresh subagent per task with review after each (thorough, expensive);
`executing-plans` implements everything in one session with one review at the end
(cheap). Ask for one and say why.

Full set: `using-superpowers`, `brainstorming`, `writing-plans`, `executing-plans`,
`subagent-driven-development`, `dispatching-parallel-agents`,
`test-driven-development`, `systematic-debugging`, `verification-before-completion`,
`requesting-code-review`, `receiving-code-review`, `using-git-worktrees`,
`finishing-a-development-branch`, `writing-skills`, `diagnosing-superpowers`.

### Gotchas

- No `~/.claude/skills/superpowers` clone — that path is legacy. The porting guide
  explicitly forbids touching user global config.
- Telemetry on by default (sends version only). Opt out with
  `SUPERPOWERS_DISABLE_TELEMETRY=1`.
- Hook needs `bash` (Git Bash on Windows). Node only for two optional extras.
- It is opinionated and loud. If it fights your preferred flow, disable the plugin
  rather than arguing with it.

---

## mattpocock/skills

Opinionated engineering workflow — planning (`to-spec` → `to-tickets` → `implement`),
codebase comprehension (`understand*`, `codebase-design`, `domain-modeling`), and
quality gates (`tdd`, `code-review`, `diagnosing-bugs`).

Managed by the [`skills`](https://github.com/vercel-labs/skills) CLI (npm `skills`,
bin `skills`, directory skills.sh). Two independent lockfiles:

| Lockfile | Scope | Version | Commit? |
|---|---|---|---|
| `skills-lock.json` (repo root) | project | 1 | **yes — already tracked** |
| `~/.agents/.skill-lock.json` | global | 3 | no (lives in `$HOME`) |

The global lock tracks **300 skills across 14 agents** (opencode, claude-code, cursor,
codex, cline, droid, gemini-cli, github-copilot, kilo, kimi-code-cli, warp, zed,
amp, command-code). 38 of them are mattpocock's; the rest come from other sources.
An older lock format gets **wiped** on read — this one is current v3.

### Update

```bash
npx skills@latest update -g              # all globally-installed skills
npx skills@latest update -g tdd grill-me # or name them explicitly
```

Naming the skills avoids touching the ~262 non-mattpocock global entries.

### Add / remove

```bash
npx skills@latest add mattpocock/skills --list          # 38 available
npx skills@latest add mattpocock/skills -g -a opencode --skill pr -y
npx skills@latest remove <skill> -g -y
npx skills@latest check                                  # show pending updates
```

Scope: `-g` → global (`~/<agent>/skills/`), default → project (`./<agent>/skills/`).
Pick **one** scope per agent — installing both gives you every skill twice.

### Usage

Both invocation styles, encoded in frontmatter as
`disable-model-invocation: true`:

- **User-invoked** (flag present) → type `/skill-name`. The 11 planning/workflow skills.
- **Model-invoked** (flag absent) → agent auto-activates from the description. The
  quality/analysis skills.

A user-invoked skill may invoke model-invoked ones, never another user-invoked one.

**Planning** (user-invoked) — `ask-matt` (router: "which skill fits?"), `to-spec`
(conversation → spec on the issue tracker), `to-tickets` (spec → tracer-bullet tickets
with blocking edges), `implement`, `implement-spec`, `wayfinder`, `pr`, `retro`,
`triage`, `improve-codebase-architecture`, `grill-with-docs`, `wizard`,
`setup-matt-pocock-skills`.

**Quality** (model-invoked) — `tdd` (red-green-refactor, one vertical slice at a time),
`code-review` (Standards + Spec axes as parallel sub-agents), `codebase-design`,
`domain-modeling`, `diagnosing-bugs`, `prototype`, `research`.

**Productivity** — `grill-me`, `grilling`, `handoff`, `teach`, `to-questionnaire`,
`wait-what`, `writing-for-agents` (user-invoked except `grilling`/`writing-for-agents`).

### One-time repo setup

Not yet run here. Invoke `/setup-matt-pocock-skills` once per repo — it writes
`docs/agents/issue-tracker.md`, `docs/agents/domain.md`,
`docs/agents/triage-labels.md`, and adds an `## Agent skills` block to `CLAUDE.md`
(takes precedence over `AGENTS.md` when both exist, which they do here).

### Gotchas

- **Never run bare `npx skills add` inside this repo.** With `-g` omitted it writes a
  second copy into `.agents/skills/` *and* pollutes the committed `skills-lock.json`.
  The 38 mattpocock skills are deliberately global-only here.
- Skills that moved category upstream (`retro`, `implement-spec`: `in-progress/` →
  `engineering/`) have lock paths that go stale. The current CLI resolves paths
  correctly, but a stale lock entry makes `update` skip silently. Re-add to fix.
- `resolving-merge-conflicts` was deleted upstream; the CLI reports it and skips
  deletion in non-interactive mode. Remove it explicitly (already done here).
- `understand*` and `codebase-memory` are **not** mattpocock skills — they're
  separately installed and unmanaged by this lock. Don't expect `skills update` to
  touch them.
- Set `GITHUB_TOKEN` or `GH_TOKEN` if you hit GitHub API rate limits on update checks.

---

## Working directory map

```
_bmad/                     installer-owned (BMAD core + 4 modules)
_bmad/custom/              your config overrides — never touched by the installer
_bmad-output/              your artifacts: PRDs, epics, sprint status, project-context.md
_bmad/_config/manifest.yaml   ⭐ authoritative version + module + IDE record
.agents/skills/            ← BMAD skills opencode reads (49 bmad-* + 15 module)
.agent/skills/             skills for Google Antigravity (note: singular)
.claude/skills/            skills for Claude Code — opencode reads these too
docs/agents/               mattpocock repo setup output (not yet created)
skills-lock.json           project skill lock — COMMITTED
~/.agents/skills/          ← mattpocock skills opencode reads (87 dirs)
~/.config/opencode/opencode.json   global config incl. superpowers plugin
~/.cache/opencode/packages/         cloned plugin sources (superpowers here)
```

## Restart checklist

opencode reads config and skills **once at startup** — nothing below is hot-reloaded.

1. Quit and restart opencode.
2. Confirm with `opencode debug skill` (expect 410 skills: 15 superpowers,
   49 `bmad-*`, 161 project `.agents`, 214 `.claude`).
3. Start a session and ask `bmad-help` for orientation.
