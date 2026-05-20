# ProjectHub — 第一轮迭代修复

> 问题分析 + 修复方案 · 2026-05-20

---

## Issue 1: Open Folder 操作实际成功但页面显示错误

### 现象

点击 Open Folder 按钮后，Windows 资源管理器已经正确打开目标目录（功能正常），但页面仍弹出红色错误提示：
> "Failed to execute folder: Command failed: explorer.exe E:\Projects\chronolife"

### 根因分析

文件：`server/services/actions.ts:59-65`

```typescript
execFile('explorer.exe', [projectPath], (error) => {
  if (error) {
    reject(new Error(`Failed to execute ${action}: ${error.message}`))
  }
  // ...
})
```

问题有两层：

1. **`explorer.exe` 的行为特性**：`explorer.exe` 是一个**分离进程** — 它调用成功后立即退出主进程，将实际窗口托管给 Windows Shell。它可能返回非零 exit code 或向 stderr 写入内容（尤其是参数格式不匹配时），导致 Node.js 的 `execFile` 回调收到 error 对象。

2. **Windows 路径必须用反斜杠**：`execFile` 将 `projectPath` 作为独立参数传给 `explorer.exe`。但当路径包含混合分隔符（如 `E:\Projects\chronolife`）或空格时，`explorer.exe` 可能解析失败并返回错误 — 尽管资源管理器窗口实际上已经打开了（可能是之前缓存的实例）。

根本原因是 `explorer.exe` **不适合**用 `execFile` 调用，因为它：
- 不是传统的"执行并等待退出"型命令
- 对参数格式敏感（期望 `/n,/e,path` 这样的格式）
- 即使成功也经常返回非零 exit code

### 修复方案

**方案 A（推荐）**：Windows 下用 `spawn` 以分离模式启动，不监听 exit code。

```typescript
case 'folder':
  if (platform === 'win32') {
    // explorer 是分离进程，无法用 execFile 的 exit code 判断成败
    spawn('explorer.exe', [projectPath], { detached: true, stdio: 'ignore' })
    resolve(`Opened folder for ${project.name}`)
  }
```

`spawn` + `detached: true` 让子进程完全独立运行，Node.js 不追踪其退出状态。这符合 `explorer.exe` 的设计预期。

**另外补充**：`explorer.exe` 的参数应直接传路径，不要用 `/select,` 前缀（那是选中文件用的）。当前 `explorer.exe [projectPath]` 的用法在大多数情况下是正确的，但如果还是不行，可以用 `explorer.exe /root,[projectPath]` 来显式指定打开目录。

---

## Issue 2: Open VS Code 报错 `spawn EINVAL`，无法启动

### 现象

点击 Open VS Code 按钮后，页面报错：
> "spawn EINVAL"

VS Code 没有被打开。

### 根因分析

文件：`server/services/actions.ts:22-27`

```typescript
case 'vscode':
  if (platform === 'win32') {
    shellCmd = 'code.cmd'
    args = [projectPath]
  }
```

问题在于 **`execFile` 不能直接执行 `.cmd`/`.bat` 文件**。

- `code.cmd` 是 Windows 批处理脚本（通常位于 `%LOCALAPPDATA%\Programs\Microsoft VS Code\bin\code.cmd`）
- `execFile` 直接调用操作系统的进程创建 API，绕过 shell。`.cmd` 文件不是可执行文件（exe），它**必须**由 `cmd.exe /c` 来解析执行
- Node.js 尝试直接 spawn `code.cmd` 时，Windows 返回 `EINVAL`（无效参数），因为 PE 加载器不认识 `.cmd` 格式

Node.js 文档明确说明：`execFile` 不会使用 shell，因此 `.cmd` 和 `.bat` 文件无法直接执行。这是 `exec` vs `execFile` 的核心区别。

### 修复方案

**方案 A（推荐）**：通过 `cmd.exe /c` 间接执行 `code.cmd`。

```typescript
case 'vscode':
  if (platform === 'win32') {
    shellCmd = 'cmd.exe'
    args = ['/c', 'code', projectPath]
  } else {
    shellCmd = 'code'
    args = [projectPath]
  }
```

`cmd.exe /c code <path>` 启动 shell，由 shell 解析并执行 `code` 命令（通过 PATH 找到 `code.cmd`）。

**方案 B**：直接找到 `Code.exe` 可执行文件路径。

```typescript
// 典型安装路径
const codeExe = path.join(
  process.env.LOCALAPPDATA || '',
  'Programs/Microsoft VS Code/Code.exe'
)
```

这个方案的问题：不是所有人都在默认路径安装 VS Code；Cursor/Windsurf 等 fork 版本的路径也不同。

**方案 C（备选）**：如果方案 A 仍然不稳定，移除 VS Code 快捷操作按钮。

---

## Issue 3: Git 状态信息不够丰富

### 现象

当前 Git 状态只显示：当前分支名、ahead/behind 计数、已修改/已添加/已删除/未跟踪的文件列表。用户希望能看到仓库中**所有分支**。

### 根因分析

文件：`server/services/git.ts`

当前只调用了两个 git 命令：
1. `git rev-parse --abbrev-ref HEAD` → 获取当前分支
2. `git status --porcelain -b` → 获取工作区状态

要列出所有分支，需要额外调用 `git branch -a`（或 `git for-each-ref --format='%(refname:short)' refs/heads/`）。

### 需要改动的数据模型

当前 `GitStatus` 接口：

```typescript
export interface GitStatus {
  branch: string
  ahead: number
  behind: number
  modified: string[]
  added: string[]
  deleted: string[]
  untracked: string[]
  isRepo: boolean
}
```

需要新增字段：

```typescript
export interface GitStatus {
  // ... 保留现有所有字段 ...
  branches: string[]           // 所有本地分支名称列表
  remoteBranches: string[]     // 所有远程分支名称列表（可选，从 git branch -r 获取）
}
```

### 实现要点

- 新增 `git branch --format='%(refname:short)'` 调用（或 `git branch -a` 后解析输出）
- `git branch -a` 输出每行一个分支名，当前分支前缀为 `* `，远程分支前缀为 `remotes/origin/`
- 前端 `GitStatusBadge` 组件增加一个 hover tooltip 或可展开区域，显示全部分支列表
- `ProjectDetail` 详情面板中展示完整分支列表

---

## Issue 4: 自定义分类功能

### 现象

当前分类完全基于自动检测的技术栈（React、Go、Python 等）。用户希望：
1. 创建自定义分类（如"工作项目"、"个人项目"、"开源贡献"等）
2. 将项目分配到自定义分类
3. 重新扫描后，项目的自定义分类关系**保持不变**（持久化）
4. 保留技术栈自动分类，但**默认展示自定义分类**

### 设计分析

这是一个**数据模型 + UI 双重改动**的需求。

#### 4.1 数据持久化位置

数据全部存储在本地 JSON 文件中，**不使用数据库**。与现有架构完全一致：

```
~/.projecthub/
├── config.json       ← AppConfig.customCategories 存在这里
│   {
│     "scanDirectories": [...],
│     "customCategories": [
      { "id": "work", "name": "Work", "color": "#f97316" },
      { "id": "personal", "name": "Personal", "color": "#22c55e" }
    ]
│   }
│
└── projects.json     ← Project.customCategory 存在这里
    {
      "projects": [
        {
          "id": "abc123",
          "name": "my-project",
          "path": "/Users/xxx/Workspace/my-project",
          "customCategory": "Work"    ← 所属分类
        }
      ]
    }
```

- `config.json` — 全局数据：有哪些自定义分类（`customCategories: string[]`），这是分类的"定义"
- `projects.json` — 项目数据：每个项目属于哪个分类（`customCategory: string | null`），这是分类的"关联"
- 纯文本 JSON，人可读，不依赖任何数据库引擎，跨平台拷贝即生效

#### 4.2 数据模型改动

**`AppConfig`** 新增自定义分类列表：

```typescript
export interface AppConfig {
  // ... 现有字段保留 ...
  customCategories: CategoryDefinition[]   // 包含 id、name、color 的对象数组
}

export interface CategoryDefinition {
  id: string       // 唯一标识（由名称自动生成，如 "work"）
  name: string     // 显示名称（如 "Work"）
  color: string    // 颜色十六进制值（如 "#f97316"）
}
```

**`Project`** 新增分类归属：

```typescript
export interface Project {
  // ... 现有所有字段保留 ...
  customCategory: string | null  // 所属自定义分类名称，null 表示未分类
}
```

#### 4.2 扫描持久化逻辑

核心问题：**重新扫描时，如何保留项目的自定义分类？**

当前扫描流程：
```typescript
// scanner.ts: scan()
for (const project of found) {
  const existing = existingMap.get(project.path)
  if (existing) {
    // 更新 lastScanned，但保留原项目的所有字段
    existing.lastScanned = now
    existingMap.set(project.path, existing)
  } else {
    // 新项目
    added++
    existingMap.set(project.path, { ...project, id, firstSeen, lastScanned })
  }
}
```

修改后的逻辑：
```typescript
for (const project of found) {
  const existing = existingMap.get(project.path)
  if (existing) {
    // 保留用户自定义的分类归属
    project.customCategory = existing.customCategory
    // 更新扫描时间
    existingMap.set(project.path, { ...existing, ...project, lastScanned: now })
  } else {
    // 新项目，customCategory 默认为 null
    existingMap.set(project.path, { ...project, id, customCategory: null })
  }
}
```

这样重新扫描时，已存在的项目会保留之前的 `customCategory`，新发现的项目默认未分类。

#### 4.3 侧边栏结构改造

```
原结构：
  Categories
  ├── All (6)
  ├── React (2)
  ├── Go (1)
  └── ...

新结构：
  自定义分类           ← 默认展开，手动管理
  ├── All (6)
  ├── Work (3)
  ├── Personal (2)
  ├── OSS (1)
  └── + 新建分类
  
  技术栈               ← 自动生成，可折叠
  ├── React (2)
  ├── Go (1)
  └── ...
```

#### 4.4 项目卡片改动

每个项目卡片新增一个分类选择器（dropdown）：
- 显示当前分类或"未分类"
- 点击展开，列出所有自定义分类
- 选择后即时调用 API 更新

### 需要新增的 API

| Method | Path | 描述 |
|--------|------|------|
| `PATCH` | `/api/projects/:id/category` | 更新项目自定义分类 |

---

## Issue 5: 本地快速启动脚本

### 需求

- 一个命令启动整个应用
- 先启动后端，后端就绪后再启动前端
- 启动完成后自动在浏览器中打开前端页面
- 使用非标准端口避免冲突（13000 / 13001）
- 支持 Windows（`.cmd`）和 Mac/Linux（`.sh`）各生成独立启动脚本

### 设计

#### 5.1 端口分配

| 服务 | 当前端口 | 新端口 | 理由 |
|------|----------|--------|------|
| 前端 (Vite) | 3000 | 13000 | 避让 React/Rails 等常见项目的 3000 |
| 后端 (Express) | 3001 | 13001 | 避让 3001 及附近端口 |

#### 5.2 启动流程

```
1. 启动后端 (npx tsx server/index.ts → 127.0.0.1:13001)
2. 轮询 http://127.0.0.1:13001/api/config 直到返回 200
3. 启动前端 (npx vite --port=13000)
4. 轮询 http://127.0.0.1:13000 直到返回 200
5. 打开浏览器 → http://localhost:13000
```

#### 5.3 脚本实现

用 **平台原生脚本**（PowerShell + Bash）：

- `scripts/start.ps1` — Windows PowerShell 启动脚本
- `scripts/start.sh` — macOS/Linux Bash 启动脚本

两个脚本功能一致：
1. 检查 node_modules 是否存在，不存在则自动执行 npm install
2. 清理端口 13001 和 13000 上的旧进程
3. 启动后端 (tsx server/index.ts)
4. 等待 3 秒后启动前端 (vite --port=13000)
5. 监听两个服务进程，任一退出则报错

#### 5.4 需要同步修改的文件

- `server/index.ts`：PORT 已从 `process.env.PORT` 读取，无需改动
- `vite.config.ts`：proxy target 需从 `3001` 改为 `13001`
- `package.json`：修改 `dev` 和 `dev:server` 脚本使用新端口

---

## Issue 6: 设置面板视觉对比度不足

### 现象

设置弹窗面板（`bg-stone-950`）和主页面背景（`bg-stone-950`）颜色完全一致，弹窗的遮罩层（`bg-black/50`）不足以产生足够对比，用户难以分辨弹窗边界。

### 根因分析

文件：`src/components/SettingsPanel.tsx:62-72`

```tsx
<motion.div className="fixed inset-0 bg-black/50 z-40" onClick={onClose}>  <!-- 遮罩 -->
  <motion.div className="bg-stone-950 border border-stone-800 ...">  <!-- 面板 -->
```

问题在于：
| 元素 | 当前颜色 | 视觉感受 |
|------|----------|----------|
| 主页面背景 | `stone-950` (#0c0a09) | 极深暖灰 |
| 面板背景 | `stone-950` (#0c0a09) | 完全相同 |
| 面板边框 | `stone-800` (#292524) | 在深色背景下几乎不可见 |
| 遮罩 | `black/50` | 半透明，降低了对比度但不改变色调 |

`stone-950` 和 `stone-800` 在暗色主题下的色差极小（HSL 差异约 5%），边框几乎消失。

### 修复方案

**方案 A（推荐 — 最小改动）**：提升面板对比 + 增强边框

```tsx
// 遮罩：降低不透明度使背景更暗
className="fixed inset-0 bg-black/70 z-40"

// 面板：改用更浅的背景 + 更亮的边框
className="bg-stone-900 border-2 border-stone-600 rounded-2xl ... shadow-2xl shadow-black/50"
```

变化：
- 面板背景 `stone-950` → `stone-900`（与主页面背景产生差异）
- 边框 `stone-800` → `stone-600` + `border-2`（边框更亮、更粗，更可见）
- 遮罩 `black/50` → `black/70`（背景更暗，弹窗更突出）
- 新增 `shadow-2xl` 产生浮起感

**方案 B**：使用 card 风格（与项目卡片统一）

```tsx
className="bg-stone-900/50 border border-stone-700 rounded-2xl ... backdrop-blur-sm"
```

增加 `backdrop-blur-sm` 模糊背景，形成毛玻璃效果。但性能略有开销。

**同步修复**：`ProjectDetailPanel` 的侧边面板也有相同的对比度问题（`bg-stone-950` + `border-stone-800`），应一并调整。

---

## 改动清单汇总

| Issue | 后端改动 | 前端改动 | 数据模型 | 配置 |
|-------|----------|----------|----------|------|
| #1 explorer.exe 误报 | `actions.ts` | - | - | - |
| #2 VS Code EINVAL | `actions.ts` | 可能移除 vscode 按钮 | - | - |
| #3 Git 分支列表 | `git.ts` + `types.ts` | `GitStatusBadge.tsx` + `ProjectDetail.tsx` | `GitStatus` 加字段 | - |
| #4 自定义分类 | `scanner.ts` + `api.ts` + `types.ts` | `Sidebar.tsx` + `ProjectCard.tsx` + `App.tsx` | `AppConfig` + `Project` 加字段 | - |
| #5 启动脚本 | - | `vite.config.ts` (proxy port) | - | `package.json` + 新建 `scripts/start.ps1` `scripts/start.sh` |
| #6 面板对比度 | - | `SettingsPanel.tsx` + `ProjectDetail.tsx` | - | - |

---

## 实现优先级

| 优先级 | Issue | 理由 |
|--------|-------|------|
| P0 | #1 explorer.exe | Bug — 功能正常但显示错误，误导用户 |
| P0 | #2 VS Code | Bug — 功能完全不可用 |
| P1 | #6 面板对比度 | 视觉体验影响使用 |
| P1 | #5 启动脚本 | 改善开发/使用体验 |
| P2 | #4 自定义分类 | 功能增强，改动面大（8+ 文件） |
| P2 | #3 Git 分支列表 | 信息增强，改动面小但非关键路径 |
