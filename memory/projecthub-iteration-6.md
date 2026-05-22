---
name: projecthub-iteration-6
description: ProjectHub iteration 6 implementation — performance, security, dead code cleanup
metadata:
  type: project
---

# ProjectHub — Iteration 6 Implementation

> 性能瓶颈、安全加固与死代码清理 · 2026-05-22

## What Changed

### Issue 1: GET /api/projects 性能瓶颈 🔴

**Problem:** `GET /api/projects` called `getGitStatus()` synchronously for every project (3 execFileSync × 5000ms timeout each). List response was O(N×git_time), blocked event loop, caused 750s worst-case for 50 projects.

**Fix:** API split
- `GET /api/projects` → no longer calls git; returns basic info + `readme` + `lastModified` only (O(N×fileIO), p95 < 200ms for 50 projects)
- New `GET /api/projects/:id/git` → returns `GitStatus` for single project on demand
- Frontend `useProjects` initializes `git: null`, lazy-loads git via `fetchProjectGit()` with `pMapLimit(8)` concurrency pool
- `GitStatusBadge` shows animated `…` placeholder while `git === null`
- Non-fatal: individual failures leave `git: null` (no error)

**Files changed:**
- `server/routes/api.ts` — removed `getGitStatus()` from list, added `/projects/:id/git` route
- `server/types.ts` — `ProjectDetail.git` made optional (`git?: GitStatus`)
- `src/types.ts` — `ProjectDetail.git` → `GitStatus | null`
- `src/api/client.ts` — added `fetchProjectGit(id: string): Promise<GitStatus>`
- `src/hooks/useProjects.ts` — lazy git loading with pMapLimit(8)
- `src/components/GitStatusBadge.tsx` — handles `git === null` state

### Issue 2: /api/open 命令注入风险 🔴

**Problem:** `action` parameter passed directly to `cmd.exe /c <action>` without validation. Any action not in `['vscode','terminal','folder']` was passed through, including shell metacharacters.

**Fix:** Per-request whitelist validation
- Each `/api/open` request calls `detectIdes()` to build whitelist: `Set(['vscode','terminal','folder', ...ides.map(i => i.command)])`
- Non-whitelist action → `400 Bad Request`
- IDE list not cached (always reflects current system state)

**Files changed:**
- `server/routes/api.ts` — `/api/open` now validates against dynamic whitelist

### Issue 3: 后端死代码（重复的过滤逻辑）🟡

**Problem:** `GET /api/projects` accepted `?search/?type/?tag` query params but frontend never sent them — dead code in backend, duplicate logic in frontend.

**Fix:** Deleted backend filter code (14 lines), simplified `fetchProjects()` signature.

**Files changed:**
- `server/routes/api.ts` — removed `?search/?type/?tag` handling
- `src/api/client.ts` — simplified `fetchProjects()` (no params)

## Verification

- `tsc --noEmit` passes
- `npm run build` succeeds
- `GET /api/projects` returns 41 projects without `git` field
- `GET /api/projects/452fb6dd/git` returns valid git status
- `POST /api/open` with `action=malicious&dir` returns `400 Invalid action`

## Docs Updated

- `design.md` — 5.1 endpoint table updated (new `/projects/:id/git` endpoint, removed search params), 4.4 runtime data table (git via on-demand + concurrency 8), 8. security (whitelist validation each request)
- `implementation.md` — API routes chunk (removed dead code examples, updated to current state), types (git optional, IdeInfo platform field), useProjects hook (lazy loading with pMapLimit), GitStatusBadge (null handling)

## Not Done (Per Spec)

- No `asyncHandler` abstraction (8 stable routes, abstraction is noise)
- No unit tests (single-user local tool, no CI/team)
- No README cache, thumbnails, favorites

## Related

- Iteration 1: explorer.exe fix, VS Code EINVAL fix, Git branch list, custom categories, start script, panel contrast
- Iteration 2: Branch newline display, IDE detection, settings layout, i18n
- Iteration 3: IDE hardcoded list, terminal tab reuse, i18n time format, README full, error scroll-to-top
- Iteration 4: Card category tags, detail panel dropdown, discoverability
- Iteration 5: Sidebar single-scroll, category rename, drag reorder