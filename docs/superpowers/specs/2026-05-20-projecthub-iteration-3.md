# ProjectHub — 第三轮迭代修复

> 问题分析 + 修复方案 · 2026-05-20（修订版）

---

## Issue 1: IDE 下拉列表（硬编码方案 + 实际命令确认）

### 现象

1. IDE 检测不可靠 — 路径检测扫不到 D 盘安装的 IDE，命令检测（`where`）假阳性严重
2. 列表中显示了用户未安装的 IDE，误导用户
3. Trae / CodeBuddy 的国内版 / 国际版区分逻辑不清晰
4. 用户电脑上很多 IDE 装在 D 盘，不在系统盘

### 用户确认的实际可执行文件名

| IDE | 版本 | 可执行文件名 |
|-----|------|-------------|
| VS Code | 国际版 | `Code.exe` |
| Cursor | 国际版 | `Cursor.exe` |
| Trae | 国内版 | `Trae CN.exe`（启动器名，非安装目录） |
| Trae | 国际版 | `Trae.exe` |
| CodeBuddy | 国内版 | `CodeBuddy CN.exe` |
| CodeBuddy | 国际版 | `CodeBuddy.exe` |
| Antigravity | — | `Antigravity.exe` |
| Qoder | — | `Qoder.exe` |
| Kiro | — | `Kiro.exe` |
| Windsurf | — | `Windsurf.exe` |
| JetBrains | — | `idea64.exe` |

### 方案结论

**放弃动态检测，改用固定硬编码列表。**

原因：
1. 检测逻辑复杂且不可靠（PATH 歧义、路径不固定、版本区分困难）
2. 不同 IDE 版本命令名不同，用户自己选择更可靠
3. 点击时直接执行命令，系统 PATH 中有什么就打开什么

### 修复方案

**移除全部检测逻辑**，`server/services/ides.ts` 改为返回固定列表：

```typescript
const STATIC_IDES: IdeInfo[] = [
  { id: 'vscode', name: 'VS Code', command: 'code', detected: true },
  { id: 'cursor', name: 'Cursor', command: 'cursor', detected: true },
  { id: 'trae-cn', name: 'Trae CN', command: 'trae-cn', detected: true },
  { id: 'trae', name: 'Trae', command: 'trae', detected: true },
  { id: 'codebuddy-cn', name: 'CodeBuddy CN', command: 'codebuddy-cn', detected: true },
  { id: 'codebuddy', name: 'CodeBuddy', command: 'codebuddy', detected: true },
  { id: 'antigravity', name: 'Antigravity', command: 'antigravity', detected: true },
  { id: 'qoder', name: 'Qoder', command: 'qoder', detected: true },
  { id: 'kiro', name: 'Kiro', command: 'kiro', detected: true },
  { id: 'windsurf', name: 'Windsurf', command: 'windsurf', detected: true },
]
```

用户点击后，执行 `cmd.exe /c [command] [projectPath]`。系统 PATH 中有哪个命令就打开哪个，没有就报错。

`actions.ts` 中的动态 IDE 逻辑保持不变。

### 下拉框 UX 修复（已实现）

- `ProjectDetail.tsx` IDE 菜单：**向上展开**（`bottom-full`）+ `onBlur` 失焦关闭
- `ProjectCard.tsx` IDE 菜单：**向下展开**（`bottom-full`）+ `onBlur` 失焦关闭

---

## Issue 2: 终端标签页复用

### 现象

每次在 ProjectHub 中点击"终端"按钮，都会打开一个**全新的独立 Windows Terminal 窗口**。

### 根因分析

`wt.exe -d [path]` 不带 `-w` 参数时创建新窗口。

### 修复方案

```typescript
// server/services/actions.ts
args = ['-w', '0', 'new-tab', '-d', projectPath]
```

✅ 已实现。

---

## Issue 3: 国际化遗漏 — 分类标题 & 时间格式

### 现象

1. 选择中文后，卡片区域左上角显示 `Java Projects` 而非 `Java 项目`
2. 项目卡片左下角 `Updated 1mo ago` 未翻译为中文

### 修复方案

- `MainContent.tsx` — 技术栈名称 `tech.*` 映射，`app.projectsSuffix` 后缀
- `ProjectCard.tsx` — `formatRelativeTime` 时间单位委托 i18n
- `SearchHeader.tsx` — `formatScanTime` 时间单位委托 i18n

✅ 已实现。

---

## Issue 4: README 完整内容显示

### 现象

详情面板只显示 2000 字符截断内容。

### 修复方案

- `api.ts` 详情接口：`readReadmeFull()` 无限制读取
- `ProjectDetail.tsx`：`fetchProject(id)` 获取完整内容 + `max-h-[60vh]`

✅ 已实现。

---

## Issue 5（新增）: 错误信息自动滚动到顶部

### 现象

错误信息（如"操作失败"）显示在页面顶部，但项目卡片多时，向下滑动点击按钮触发错误，用户看不到报错，误以为点击没反应。

### 根因分析

错误提示位置在页面顶部 DOM 中，但页面内容区域（`.flex-1.overflow-y-auto`）可滚动。报错时如果用户视线不在顶部，就看不到错误提示。

### 修复方案

报错信息出现时，**自动滚动页面到顶部**，使用 `scrollTo(0, 0)`：

```tsx
// MainContent.tsx
const [actionError, setActionError] = useState<string | null>(null)

// 在报错出现时滚动
const handleActionError = (msg: string) => {
  setActionError(msg)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
```

或使用 `ref` 引用滚动容器：

```tsx
const scrollRef = useRef<HTMLDivElement>(null)
const handleError = (msg: string) => {
  setActionError(msg)
  scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
}
```

---

## 改动清单汇总（最终版）

| Issue | 后端改动 | 前端改动 |
|-------|----------|----------|
| #1 IDE 硬编码列表 | `ides.ts` — 移除检测，返回固定 `STATIC_IDES`；`actions.ts` — 支持 `trae-cn`/`codebuddy-cn` 等命令 | `ProjectCard.tsx` + `ProjectDetail.tsx` — onBlur 关闭、向上/下展开 |
| #2 终端复用 | `actions.ts` — `wt -w 0 new-tab -d` | — |
| #3 i18n 遗漏 | — | `MainContent.tsx`、`ProjectCard.tsx`、`SearchHeader.tsx` — tech 映射 + 时间格式 i18n |
| #4 README 完整 | `api.ts` — `readReadmeFull()` 无截断 | `ProjectDetail.tsx` — `fetchProject` 完整内容 + `max-h-[60vh]` |
| #5 错误自动滚顶 | — | `MainContent.tsx` — 报错时 `scrollTo(0, 0)` |

---

## 实现优先级

| 优先级 | Issue | 状态 |
|--------|-------|------|
| P0 | #5 错误滚顶 | 本次新增 |
| P0 | #1 IDE 列表 + 命令 | 本次修复 |
| P1 | #2 终端复用 | ✅ 已实现 |
| P1 | #3 i18n 遗漏 | ✅ 已实现 |
| P1 | #4 README 完整 | ✅ 已实现 |