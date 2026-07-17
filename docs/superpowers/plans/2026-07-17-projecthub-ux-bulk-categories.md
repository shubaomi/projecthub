# ProjectHub UX and Bulk Categorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make uncategorized projects easy to find and batch-classify while removing unnecessary full refreshes, misleading Git logs, slow first paint, and the highest-impact responsive and settings UX defects.

**Architecture:** Add one atomic batch-category endpoint backed by a single `projects.json` write, then patch the React project state locally for both single and bulk changes. Keep Git status progressive and non-blocking, add a responsive sidebar and compact cards, and treat modal edits as disposable drafts until Save.

**Tech Stack:** React 19, TypeScript 5.8, Express 4, Node 22 test runner with `tsx`, Tailwind CSS 4, Motion.

## Global Constraints

- Preserve the pre-existing uncommitted edits in `src/App.tsx`, `src/components/SearchHeader.tsx`, and `src/components/Sidebar.tsx`.
- Batch selection is scoped to the current filtered result and clears when the active sidebar category changes.
- Do not add a separate management page, data grid, WebSocket, React Query, or new runtime dependency.
- Category changes must not refetch the complete project list or Git status.
- Expected Git probe failures must not write red stderr output; real service failures remain visible.

---

### Task 1: Add test harness and category/readme behavior tests

**Files:**
- Modify: `package.json`
- Create: `src/utils/projectCategories.test.ts`
- Create: `src/utils/readme.test.ts`
- Create: `server/services/categories.test.ts`
- Create: `server/services/git.test.ts`

**Interfaces:**
- Consumes: existing `Project`, `ProjectDetail`, and `CategoryDefinition` types.
- Produces: failing contracts for `isProjectUncategorized`, `patchProjectCategories`, `getReadableReadmeExcerpt`, `applyCategoryUpdates`, and silent invalid-Git handling.

- [x] **Step 1: Add a deterministic Node test command**

```json
"test": "node --import tsx --test src/utils/projectCategories.test.ts src/utils/readme.test.ts server/services/categories.test.ts server/services/git.test.ts"
```

- [x] **Step 2: Write failing tests**

```ts
test('treats missing and orphaned category ids as uncategorized', () => {
  assert.equal(isProjectUncategorized({ customCategory: null }, new Set(['work'])), true)
  assert.equal(isProjectUncategorized({ customCategory: 'deleted' }, new Set(['work'])), true)
  assert.equal(isProjectUncategorized({ customCategory: 'work' }, new Set(['work'])), false)
})

test('patches only selected projects without mutating the input', () => {
  const next = patchProjectCategories(projects, ['a', 'c'], 'work')
  assert.notEqual(next, projects)
  assert.deepEqual(next.map((p) => p.customCategory), ['work', null, 'work'])
})

test('returns null rather than partially updating unknown ids', () => {
  assert.equal(applyCategoryUpdates(projects, ['missing'], 'work'), null)
})
```

- [x] **Step 3: Run tests and verify RED**

Run: `npm test`
Expected: FAIL because the utility and service modules do not exist yet.

---

### Task 2: Implement atomic category updates and silent Git probing

**Files:**
- Create: `server/services/categories.ts`
- Modify: `server/services/scanner.ts`
- Modify: `server/routes/api.ts`
- Modify: `server/services/git.ts`
- Modify: `src/api/client.ts`

**Interfaces:**
- Produces: `applyCategoryUpdates(projects, projectIds, category): Project[] | null`.
- Produces: `updateProjectCategories(projectIds, category): Project[] | null`.
- Produces: `PATCH /api/projects/categories` with `{ projectIds, customCategory }`.
- Produces: client `updateProjectCategories(projectIds, category): Promise<Project[]>`.

- [x] **Step 1: Implement the pure batch update**

```ts
export function applyCategoryUpdates(projects: Project[], projectIds: string[], customCategory: string | null): Project[] | null {
  const ids = new Set(projectIds)
  if ([...ids].some((id) => !projects.some((project) => project.id === id))) return null
  return projects.map((project) => ids.has(project.id) ? { ...project, customCategory } : project)
}
```

- [x] **Step 2: Add one-read/one-write persistence and route validation**

The route rejects empty/non-string id arrays, unknown category ids, and missing projects before writing. It returns all updated project records.

- [x] **Step 3: Make Git subprocess stderr explicit**

Use `stdio: ['ignore', 'pipe', 'pipe']` for every synchronous Git command so an exit-128 probe is caught without being inherited by PowerShell.

- [x] **Step 4: Run tests and verify GREEN for server behavior**

Run: `npm test`
Expected: category and Git tests pass; frontend utility tests still fail until Task 3.

---

### Task 3: Add local project-state updates and progressive first paint

**Files:**
- Create: `src/utils/projectCategories.ts`
- Create: `src/utils/readme.ts`
- Modify: `src/hooks/useProjects.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/ReadmeExcerpt.tsx`

**Interfaces:**
- Produces: `isProjectUncategorized(project, validCategoryIds): boolean`.
- Produces: `patchProjectCategories(projects, ids, category): ProjectDetail[]`.
- Produces: hook `updateCategories(ids, category): Promise<Project[]>`.
- Produces: hook `lastScanResult: ScanResult | null`.

- [x] **Step 1: Implement tested frontend utilities**

```ts
export function patchProjectCategories(projects: ProjectDetail[], ids: string[], customCategory: string | null) {
  const selected = new Set(ids)
  return projects.map((project) => selected.has(project.id) ? { ...project, customCategory } : project)
}
```

- [x] **Step 2: Release initial loading after the project list arrives**

Call `setLoading(false)` immediately after `setProjects(withNullGit)`, then continue the bounded Git requests in the background. Ignore stale Git results from an older refresh generation.

- [x] **Step 3: Replace single-category full refresh with local patching**

Both detail changes and bulk changes call `updateCategories`; neither calls `refresh()`.

- [x] **Step 4: Avoid mutating React state during sorting**

Use `[...result].sort(...)` in `App.tsx`.

- [x] **Step 5: Run all tests**

Run: `npm test`
Expected: PASS.

---

### Task 4: Add uncategorized navigation and batch selection UI

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/MainContent.tsx`
- Modify: `src/components/ProjectGrid.tsx`
- Modify: `src/components/ProjectCard.tsx`
- Modify: `src/i18n/zh.ts`
- Modify: `src/i18n/en.ts`

**Interfaces:**
- Sidebar uses reserved filter id `__uncategorized__`.
- MainContent owns selection mode and clears selected ids when `activeCategory` changes.
- ProjectCard accepts `selectionMode`, `selected`, and `onToggleSelection`.

- [x] **Step 1: Show All, Uncategorized, and custom category counts together**

Count projects with null or orphaned category ids as Uncategorized.

- [x] **Step 2: Add current-result selection mode**

Provide Batch categorize, Select all current results, Clear, target category, Apply, and Exit controls. Disable Apply when nothing is selected or a request is active.

- [x] **Step 3: Make cards keyboard-operable and compact**

Use button semantics/keyboard handling on the card, put selection control in the existing top-right space, clamp README summary, and keep launch buttons from triggering card selection.

- [x] **Step 4: Remove filter exit-animation blanking**

Render the keyed card list without `AnimatePresence` exit animations while retaining a small initial card fade.

---

### Task 5: Fix responsive layout, modal drafts, and startup output

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/SearchHeader.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/ProjectDetail.tsx`
- Modify: `scripts/start.ps1`

**Interfaces:**
- App owns `sidebarOpen`; sidebar becomes a drawer below the desktop breakpoint.
- Settings initializes a fresh draft whenever it opens and restores language/drafts on Cancel.

- [x] **Step 1: Add a narrow-layout sidebar drawer**

Show a menu button in the header, close the drawer after selecting a category, and leave the desktop sidebar unchanged.

- [x] **Step 2: Make header actions fit at 768px**

Use one-line compact controls, hide secondary scan metadata first, and retain full search width.

- [x] **Step 3: Reset modal drafts on open/cancel and keep actions visible**

Use an `open`-dependent draft initialization; Cancel restores the persisted language. Keep the action footer sticky and display invalid-directory guidance instead of silently accepting it.

- [x] **Step 4: Add dialog semantics and Escape close**

Add `role="dialog"`, `aria-modal="true"`, labelled headings, accessible close names, and Escape handling to settings and detail panels.

- [x] **Step 5: Normalize PowerShell output**

Set UTF-8 output and `NO_COLOR=1` inside both jobs so Vite output does not leak ANSI fragments or mojibake.

---

### Task 6: Verify behavior end to end

**Files:**
- Modify only if verification finds a scoped defect.

- [x] **Step 1: Run automated checks**

Run: `npm test`
Expected: all tests pass with no stderr noise.

Run: `npm run lint`
Expected: TypeScript exits 0.

Run: `npm run build`
Expected: Vite production build exits 0.

- [x] **Step 2: Browser verification**

Verify desktop and 768px layouts, Uncategorized count/filter, current-result selection clearing, batch assignment, single assignment without full-page skeleton/Git reload, search responsiveness, settings Cancel, Escape close, and scan completion feedback.

- [x] **Step 3: Review the final diff**

Confirm every changed line maps to the agreed UX scope and the three pre-existing edits remain represented.
