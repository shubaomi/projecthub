# ProjectHub — 第六轮迭代修复

> 性能瓶颈、安全加固与死代码清理 · 2026-05-22

---

## 问题概述

本轮三个问题来自对项目结构与代码路径的复盘：

| # | 问题 | 类别 | 严重度 |
|---|------|------|--------|
| 1 | `GET /api/projects` 同步串行执行 Git 命令，列表请求随项目数线性恶化 | 性能 | 🔴 高 |
| 2 | `/api/open` 接口未对 `action` 做白名单校验，存在命令注入风险 | 安全 | 🔴 高 |
| 3 | 后端 `/api/projects` 的搜索/过滤逻辑与前端重复，且前端从未调用 —— 死代码 | 代码质量 | 🟡 中 |

本轮**有意不做**的优化：
- `asyncHandler` 抽象 —— 8 个稳定路由的样板代码，抽象反而是噪音
- 单元测试 —— 单用户本地工具，无 CI、无团队，靠手测即可
- README 缓存重构、缩略图、收藏置顶等 —— 未要求

遵循"克制"原则：每一项修改都能直接追溯到上述三个问题，不夹带无关重构。

---

## Issue 1: `GET /api/projects` 性能瓶颈

### 现象

打开 ProjectHub 首页时，项目列表的等待时间随项目数量近似线性增长。当扫描目录中的项目达到几十个时，首屏可见的延迟达到数秒。在某些项目（仓库较大、远程不可达）下，单个 Git 命令可能触发 5 秒超时，进一步放大延迟。

更严重的是：在等待期间，整个 Express 后端无法响应任何其它请求（`/api/open`、`/api/scan` 等）。

### 根因分析

文件：`server/routes/api.ts:15-51`

每次 `GET /api/projects` 的处理流程：

```ts
const withDetails = filtered.map((p) => {
  const readme = readReadmeExcerpt(p.path, 200)  // 同步 fs.readFileSync
  const git = getGitStatus(p.path)                // 同步 execFileSync × 3
  let lastModified = ''
  try { const stat = fs.statSync(p.path); lastModified = stat.mtime.toISOString() } catch {}
  return { ...p, git, readme, lastModified }
})
```

`getGitStatus()`（`server/services/git.ts:19-104`）内部执行三次 `execFileSync`：
1. `git rev-parse --abbrev-ref HEAD` — 当前分支
2. `git branch --format=...` — 所有本地分支
3. `git status --porcelain -b` — 工作区状态

每次 timeout 5000ms，**串行**执行。Node.js 单线程模型下，这意味着列表接口**阻塞事件循环** ≈ `项目数 × 3 × 单次 Git 耗时`。

### 影响估算

| 项目数 | 每项目 Git 耗时（典型） | 列表接口总耗时 | 最坏情况（超时） |
|--------|----------------------|--------------|---------------|
| 10     | ~50ms                | ~500ms       | 150s          |
| 50     | ~50ms                | ~2.5s        | 750s          |
| 100    | ~50ms                | ~5s          | 25 分钟         |

最坏情况下用户会以为系统挂死。

### 修复方案

**方案：API 拆分 + 前端懒加载（同时受限并发）**

将"项目元信息"与"Git 状态"解耦为两个独立 API：

#### 后端改动

1. **`GET /api/projects` 不再调用 `getGitStatus()`**
   - 只返回基本信息（`id`/`name`/`path`/`type`/`tags`/`customCategory`/`firstSeen`/`lastScanned`/`readme`/`lastModified`）
   - `readme` 和 `lastModified` 仍同步读取（廉价，单次约 1ms）
   - **响应时间从 O(N × Git) 降为 O(N × 文件 IO)** —— 实测可降至 100ms 以内

2. **新增 `GET /api/projects/:id/git`**
   - 单独返回某个项目的 `GitStatus`
   - 内部仍调用 `getGitStatus()`，但作用域限于单项目
   - 单次请求只阻塞 ~150ms（3 个 Git 命令）

```ts
// 新增路由
router.get('/projects/:id/git', (req, res) => {
  const project = getProjectById(req.params.id)
  if (!project) return res.status(404).json({ success: false, error: 'Project not found' })
  const git = getGitStatus(project.path)
  res.json({ success: true, data: git })
})
```

#### 前端改动

1. **`useProjects` 的 `projects` 数据中 `git` 字段初始为 `null`/`undefined`**
2. **新增 `useProjectGit(projectId)` hook 或在 `useProjects` 内统一管理**
   - 列表渲染完成后，对所有可见项目并发请求 Git 状态
   - 状态填回 `projects[i].git`，UI 自动重渲染对应卡片的 Git badge

3. **并发限制（关键）**
   - 项目数较多时（如 80+），瞬间 80 个并发 Git 子进程会拖慢本地系统
   - 实现一个简单的并发池：同时最多 **8 个** 在途请求
   - 约 10 行代码：

```ts
async function pMapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}
```

#### 用户感知

| 阶段 | 当前 | 新方案 |
|------|------|--------|
| 列表出现 | 数秒后整体出现 | 100ms 内列表就位 |
| Git badge | 与列表同时出现 | 列表出现后 1-2 秒陆续填充 |
| 后端响应其它请求 | 列表期间阻塞 | 列表瞬间释放，Git 拉取期间仍可响应 |

**取舍**：用户会看到 Git badge "逐渐亮起" —— 这是 git 状态实时性换来的视觉成本。结合 ProjectHub 是"看一眼仪表盘"的使用场景，可以接受。

### 不做的事

- ❌ 不做 IntersectionObserver 视口检测懒加载 —— 多一层复杂度，项目数有限不必要
- ❌ 不引入 React Query / SWR —— 数据模型简单，原生 hook 足够
- ❌ 不做 WebSocket 推送 Git 状态 —— 无价值

---

## Issue 2: `/api/open` 命令注入风险

### 现象

后端通过 `/api/open` 接口启动 IDE 时，将 `action` 字符串直接拼到 `cmd.exe /c <action>` 中执行。如果 `action` 含 shell 特殊字符（`&`、`|`、`;`、`>`、反引号等），可能触发命令注入。

虽然 ProjectHub 是本地单用户工具、绑定 `127.0.0.1`，但：
1. 浏览器中任何打开的页面都可以构造 `fetch('http://127.0.0.1:13001/api/open', {...})` 请求（CORS 不限制简单 POST）
2. 即使无外部攻击者，未来如有"动态注册 IDE"等功能，输入路径也可能扩大

属于**易修复、零成本、消除隐患**类问题。

### 根因分析

文件：`server/services/actions.ts:18-47`

```ts
if (action !== 'vscode' && action !== 'terminal' && action !== 'folder') {
  return new Promise((resolve, reject) => {
    if (osPlatform === 'win32') {
      const cmd = 'cmd.exe'
      const args = ['/c', action, projectPath]   // ⚠️ action 直接进入 cmd.exe
      execFile(cmd, args, (error) => { ... })
    }
  })
}
```

`cmd.exe /c` 会对参数做二次解析。即便 `execFile` 本身不走 shell，`action` 一旦含 `&`、`|`、`>`，仍会被 `cmd.exe` 视为命令分隔符。

**调用链**：`POST /api/open` → `executeAction()` → `cmd.exe /c <action>`，整条链路上 `action` 没有任何白名单或字符校验。

### 修复方案

**方案：每次请求都向 `detectIdes()` 校验白名单**

#### 流程

```
POST /api/open { projectId, action }
  ↓
读取 detectIdes() 返回的可执行 IDE 列表
  ↓
合法 action = ['vscode', 'terminal', 'folder', ...ides.map(i => i.command)]
  ↓
action ∉ 合法集合 → 400 Bad Request
  ↓
否则进入 executeAction()
```

#### 后端改动

文件：`server/routes/api.ts:134-158`

```ts
router.post('/open', async (req, res) => {
  const { projectId, action } = req.body
  if (!projectId || !action) {
    return res.status(400).json({ success: false, error: 'Missing projectId or action' })
  }

  const STANDARD_ACTIONS = ['vscode', 'terminal', 'folder']
  const ides = await detectIdes()
  const allowedIdeCommands = ides.map(i => i.command)
  const allAllowed = new Set([...STANDARD_ACTIONS, ...allowedIdeCommands])

  if (!allAllowed.has(action)) {
    return res.status(400).json({ success: false, error: `Invalid action: ${action}` })
  }

  const msg = await executeAction(projectId, action as OpenAction)
  res.json({ success: true, data: { message: msg } })
})
```

#### 为什么不缓存 IDE 列表

- 用户点开 IDE 是**低频操作**（每次操作不超过几次/分钟），不会成为热点
- `detectIdes()` 单次调用约 50ms，用户感知不到
- 不缓存 = **永远反映当前系统真实可用 IDE**，新装 IDE 立即生效，无需重启服务

### 关于路径中的特殊字符

`projectPath` 本身也会作为参数传给 `cmd.exe`。如果项目路径含 `&` 等字符，可能触发同样问题。

**初步判断**：`execFile` 不走 shell，参数以数组形式传入，Windows 下 Node.js 会做 quoting。但 `cmd.exe /c` 内层解析仍可能出问题。

**本轮处理**：
- 不在本轮主动加路径校验 —— 没有证据表明这是真实问题
- 修复 #2 时**临时手动测试**一个名为 `test&dir` 的项目能否正常打开
- 如发现问题，新开 Issue 处理

### 不做的事

- ❌ 不启动时缓存 IDE 列表 —— 用户体验不一致（新装 IDE 需重启）
- ❌ 不引入 CSP/CSRF 等通用 Web 安全机制 —— 本地工具不需要
- ❌ 不重构整个 `executeAction` 的平台分支结构 —— 与本 Issue 无关

---

## Issue 3: 后端死代码 —— 重复的过滤逻辑

### 现象

`server/routes/api.ts:18-32` 中 `GET /api/projects` 接口接受 `?search`、`?type`、`?tag` 三个查询参数并执行过滤：

```ts
const search = (_req.query.search as string || '').toLowerCase()
const type = _req.query.type as string | undefined
const tag = _req.query.tag as string | undefined

let filtered = projects
if (search) { filtered = filtered.filter(...) }
if (type)   { filtered = filtered.filter(...) }
if (tag)    { filtered = filtered.filter(...) }
```

但前端 `src/api/client.ts` 的 `fetchProjects()` **从不传递这些参数**。前端在 `src/App.tsx:27-46` 用几乎相同的逻辑对本地数组做过滤。

### 根因分析

- 这段后端过滤是早期 API 设计的产物 —— 当时假设前端会按需查询
- 实际演化中前端选择"一次性加载 + 本地过滤"模型，因为：
  - 项目数量上限有限（几百个）
  - 搜索响应需要"打字即筛"，每次按键发请求过重
  - 分类切换需要瞬间响应

后端的查询参数因此**永远不会进入 if 分支**，是纯死代码。

### 影响

- ✘ 无功能影响
- ✓ 增加阅读负担（读者会以为这是有用逻辑）
- ✓ 未来如需后端过滤，可能误以为已有实现，导致不一致

### 修复方案

**直接删除 `api.ts:18-32` 的过滤逻辑**，保留：

```ts
router.get('/projects', (_req, res) => {
  try {
    const projects = loadProjects()
    const withDetails = projects.map((p) => {
      const readme = readReadmeExcerpt(p.path, 200)
      let lastModified = ''
      try { lastModified = fs.statSync(p.path).mtime.toISOString() } catch {}
      return { ...p, readme, lastModified }  // 注意：本轮 Issue 1 也会移除 git 字段
    })
    res.json({ success: true, data: withDetails })
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
  }
})
```

约 10 行删除，零风险。

### 担忧与回应

| 担忧 | 回应 |
|------|------|
| 将来项目数过万怎么办？ | ProjectHub 是本地扫描工具，几百个项目顶天。这个担忧不会成真。 |
| 后端过滤更"标准 RESTful"？ | RESTful 不等于"必须提供查询参数"。无人调用的接口比少功能的接口更糟。 |
| 删了将来想加怎么办？ | 加回来 10 行的成本远低于现在维护死代码的认知负担。 |

---

## 实施顺序

按"风险递增"顺序执行，每完成一项独立可验证：

1. **Issue 3：删后端死代码**（最小改动，零风险，开胃）
   - 删 `api.ts:18-32`
   - 验证：列表接口仍返回完整数据

2. **Issue 2：白名单校验**（独立改动，安全相关）
   - 改 `api.ts` 的 `/api/open` 路由
   - 验证：合法 action 仍能启动；构造 `action=foo&bar` 收到 400

3. **Issue 1：API 拆分 + 前端懒加载**（最大改动，最后做）
   - 后端：移除 `/api/projects` 的 git 调用 + 新增 `/api/projects/:id/git`
   - 前端：在 `useProjects` 或新 hook 中并发拉取 git，限 8 并发
   - 验证：列表 100ms 内出现；Git badge 1-2 秒陆续填充；服务期间其它请求不卡

---

## 不修改的接口契约

- `ProjectDetail` 类型中 `git` 字段保留，但变为可选/可空（前端要兼容 `undefined`）
- `GET /api/projects` 响应结构保持 `{ success, data }` 不变
- `POST /api/open` 请求体不变

---

## 验收清单

- [ ] Issue 3：后端 `/api/projects` 不再有 `?search/?type/?tag` 参数处理
- [ ] Issue 2：`POST /api/open` 对非白名单 `action` 返回 400
- [ ] Issue 2：手动测试路径含 `&` 的项目能否正常打开（如不能，记录到下一轮）
- [ ] Issue 1：`GET /api/projects` p95 响应时间 < 200ms（50 个项目场景）
- [ ] Issue 1：`GET /api/projects/:id/git` 单次响应 < 500ms（典型项目）
- [ ] Issue 1：前端首屏列表出现时间 < 300ms
- [ ] Issue 1：并发限制生效（同时在途请求 ≤ 8）
- [ ] Issue 1：列表期间发起其它请求（如 `/api/scan`）不被阻塞
- [ ] `npm run lint` 通过（tsc --noEmit 无错误）
- [ ] 手动回归：搜索、分类切换、打开 IDE、刷新扫描、查看详情面板均工作正常

---

## 后续可能的迭代（不在本轮范围）

记录但不实施：

- 路径含特殊字符的 `executeAction` 鲁棒性（视 Issue 2 手测结果决定）
- Git 状态可选缓存（若用户反馈"badge 填充太慢"）
- 核心纯函数单元测试（若开始有回归发生）
