# ProjectHub — 第二轮迭代修复（修订版）

> 问题分析 + 修复方案 · 2026-05-20

---

## Issue 1: Git 分支列表显示优化（未完全生效）

### 现象

分支列表仍然以逗号分隔的一行文本显示（如 `main, develop, feature/auth`），没有实现真正的分行显示。

### 根因分析

文件：`src/components/ProjectDetail.tsx:100-139`

虽然代码改用了 `map()` 渲染，但每项之间仍是 `', '` 逗号分隔，导致所有内容挤在同一行：

```tsx
{project.git.allBranches.map((b, i) => (
  <span key={b} className="text-stone-300">
    {i > 0 && ', '}{b}  // ← 每项之间仍是逗号
  </span>
))}
```

### 修复方案

将每项改为独立的块级元素（`<div>`）并配 bullet 前缀：

```tsx
{project.git.allBranches.map((b) => (
  <div key={b} className="flex items-start gap-1.5">
    <span className="text-stone-600 mt-0.5">•</span>
    <span className="text-stone-300">{b}</span>
  </div>
))}
```

同理适用于 `modified`、`added`、`deleted`、`untracked` 各项列表。

---

## Issue 2: IDE 自动检测与选择（未完全生效）

### 现象

IDE 选择功能仍未正确实现：
1. `ProjectCard` 组件中仍是硬编码的 `['vscode', 'terminal', 'folder']` 三个按钮，不支持动态 IDE
2. `ProjectDetail` 中虽有 IDE 下拉菜单，但 `ides` 数组为空时降级显示 VS Code
3. `fetchIdes()` 调用可能静默失败

### 根因分析

**问题 1** — `ProjectCard` 未接收 `ides` 和 `preferredIde` props：

```tsx
// ProjectCard.tsx:97-109 — 硬编码 IDE
{(['vscode', 'terminal', 'folder'] as const).map((action) => {
  const ActionIcon = action === 'vscode' ? Code2 : ...
```

`ProjectGrid` 也未传递 `ides` 给 `ProjectCard`。

**问题 2** — `ProjectCard` 自身也有 IDE 快捷按钮，且 `ProjectGrid` 的 `onOpenAction` 类型为 `'vscode' | 'terminal' | 'folder'`，不包含动态 IDE 命令字符串。

**问题 3** — `handleOpenAction` 在 `App.tsx` 中类型为 `'vscode' | 'terminal' | 'folder'`，无法传递动态 IDE 命令。

### 修复方案

1. `ProjectGrid` 增加 `ides: IdeInfo[]` 和 `preferredIde: string | null` props，透传给 `ProjectCard`
2. `ProjectCard` 增加 IDE 下拉菜单逻辑，替代硬编码的 VS Code 按钮
3. `handleOpenAction` 的 `action` 参数类型从 `'vscode' | 'terminal' | 'folder'` 改为 `string`
4. IDE 检测逻辑增强：补充已知安装路径检测（`%LOCALAPPDATA%\Programs\`）
5. IDE 检测命令从 `where` 改为实际执行 `code --version` 等来验证

---

## Issue 3: 设置面板自定义分类布局溢出（已修复）

✅ 已在上一轮实现：将颜色选择器从单行改为两行布局。

---

## Issue 4: 国际化功能（仅部分生效）

### 现象

1. 只有 `SettingsPanel` 的标签完成了国际化
2. 所有其他组件（`App`、`Sidebar`、`SearchHeader`、`ProjectCard`、`ProjectGrid`、`GitStatusBadge`、`EmptyState`、`ProjectDetail`）仍是硬编码英文
3. 语言切换按钮放在设置弹窗里太隐蔽，用户要求放在首页顶部明显位置

### 待国际化的组件和字符串

| 组件 | 需翻译字符串 |
|------|-------------|
| `App.tsx` | 页面标题、副标题、错误提示 |
| `Sidebar.tsx` | "Custom"、"Tech Stack"、"All"、Settings 按钮 |
| `SearchHeader.tsx` | 搜索框占位符、Scan Now 按钮、时间格式 |
| `ProjectCard.tsx` | Updated 时间格式、tooltip |
| `ProjectGrid.tsx` | 无（透传组件） |
| `GitStatusBadge.tsx` | tooltip 格式 |
| `EmptyState.tsx` | 三个状态的标题和描述 |
| `ProjectDetail.tsx` | Path/Type/Tags/Category/Git Status/README 等所有标签和按钮 |
| `SettingsPanel.tsx` | ✅ 已完成 |

### 修复方案

1. **新增语言切换组件** `src/components/LanguageSwitcher.tsx`，放在 `SearchHeader` 顶部右侧
2. **各组件引入 `useI18n`**：除了 `ProjectCard`、`GitStatusBadge`（展示为主，无复杂文案）、`ProjectGrid`（透传），其他都需要改造
3. **词典补充**：当前 `en.ts`/`zh.ts` 约 46 条，需扩展至覆盖所有剩余字符串

---

## 改动清单汇总

| Issue | 后端改动 | 前端改动 |
|-------|----------|----------|
| #1 分支换行显示 | - | `ProjectDetail.tsx` — 改 `<span>` 为独立 `<div>` + bullet |
| #2 IDE 检测与选择 | `ides.ts` — 增强检测逻辑 | `ProjectGrid.tsx` + `ProjectCard.tsx` — 动态 IDE，传递 `ides` props |
| #3 设置面板布局 | - | ✅ 已完成 |
| #4 国际化 | - | 7 个组件 + 新增 `LanguageSwitcher.tsx` + 扩展词典 |

---

## 实现优先级

| 优先级 | Issue | 理由 |
|--------|-------|------|
| P0 | #1 分支换行 | 极小改动，立即生效 |
| P0 | #4 语言切换位置 | 用户明确要求，影响核心体验 |
| P1 | #4 全组件国际化 | 工作量大，需系统化处理 |
| P1 | #2 IDE 检测 | 涉及多个文件传递 props 链 |
