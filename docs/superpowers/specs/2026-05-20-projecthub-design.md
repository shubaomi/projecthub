# ProjectHub — 设计文档

> 本地项目管理桌面应用 · 2026-05-20 · v1.0 MVP

## 1. 项目概述

### 1.1 定位

**轻量级本地项目管理器** — 自动扫描本地目录中的开发项目，集中展示项目信息（类型、标签、Git 状态、README 摘要），提供一键打开 IDE/终端的快捷操作。

### 1.2 目标用户

- 在本地拥有多个项目目录的开发者
- 需要在多个项目间快速切换的技术人员
- 希望有统一入口管理所有本地项目的个人开发者 / 小团队

### 1.3 非目标（v1.0 不做）

- 手动创建/编辑/删除项目（项目完全由扫描发现）
- 检测项目运行状态（dev server 是否在跑）
- 项目模板/脚手架
- 多用户/权限管理
- 远程协作功能

---

## 2. 技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| 前端 | React 19 + TypeScript + Vite | 已有原型，直接继承 |
| 样式 | Tailwind CSS 4 | 已有原型，直接继承 |
| 动画 | motion (framer-motion) | 已有原型，直接继承 |
| 图标 | lucide-react | 已有原型，直接继承 |
| 后端 | Express 4 + TypeScript (tsx) | 轻量 HTTP API，独立调试 |
| 数据 | JSON 文件 (`~/.projecthub/`) | 零依赖、可移植、人可读 |
| 系统交互 | child_process (git, code CLI) | Node.js 原生能力 |

### 选型原则

- **纯 Web 架构**：浏览器访问 `localhost:3000`，后端监听 `localhost:3001`
- **包体积最小**：不下发 Electron/浏览器内核，纯代码分发
- **跨平台兼容**：Windows/Mac/Linux 只要安装了 Node.js 即可运行
- **开源友好**：前端开发者能看懂 React，后端开发者能看懂 Express

---

## 3. 架构设计

```
浏览器 (localhost:3000)
    │
    │ HTTP REST API
    ▼
Express 后端 (localhost:3001)
    ├── routes/api.ts          —— API 路由
    ├── services/scanner.ts    —— 项目扫描发现
    ├── services/git.ts        —— Git 状态查询
    ├── services/actions.ts    —— 快捷操作执行
    └── services/config.ts     —— 配置读写
            │
    ┌───────┼───────┐
    ▼       ▼       ▼
 文件系统  Git CLI  系统命令
 目录扫描  git status code/terminal
```

### 进程模型

- **开发环境**：Vite dev server (3000) + Express (3001)，Vite proxy 转发 `/api/*` 到后端
- **生产环境**：Express 同时托管静态前端文件 + API，单端口 (3000) 运行

---

## 4. 数据设计

### 4.1 存储结构

```
~/.projecthub/
├── config.json       # 全局配置
└── projects.json     # 项目列表缓存
```

### 4.2 config.json

```json
{
  "scanDirectories": ["~/Workspace", "~/Projects"],
  "scanDepth": 3,
  "excludePatterns": ["node_modules", ".git", "dist", "build"],
  "lastScanTime": "2026-05-20T10:30:00Z"
}
```

### 4.3 projects.json

```json
{
  "projects": [
    {
      "id": "a1b2c3",
      "name": "ecommerce-frontend",
      "path": "/Users/hong/Workspace/ecommerce-frontend",
      "type": "React",
      "projectFile": "package.json",
      "tags": ["Frontend", "Vite", "Tailwind"],
      "firstSeen": "2026-01-15T08:00:00Z",
      "lastScanned": "2026-05-20T10:30:00Z"
    }
  ]
}
```

### 4.4 运行时数据（不缓存）

| 数据 | 获取方式 | 理由 |
|------|----------|------|
| Git 状态 | `git -C <path> status --porcelain -b` | 实时性要求高，不缓存 |
| README 摘要 | 读取 `README.md` 前 500 字符 | 文件内容，不缓存 |
| 最近修改 | 文件系统 stat | 始终最新 |

### 4.5 项目类型识别

通过特征文件判断项目类型：

| 特征文件 | 项目类型 |
|----------|----------|
| `package.json` (deps 含 react/vue/svelte) | 对应框架 |
| `package.json` (通用) | Node.js / JavaScript |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `requirements.txt` / `pyproject.toml` | Python |
| `.csproj` / `.sln` | .NET |
| `pom.xml` / `build.gradle` | Java / Kotlin |
| `CMakeLists.txt` | C / C++ |
| `.git` (无其他特征) | Unknown |

---

## 5. API 设计

所有 API 返回统一格式：

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

### 5.1 端点列表

| Method | Path | 描述 |
|--------|------|------|
| `GET` | `/api/projects` | 获取项目列表 |
| `GET` | `/api/projects/:id` | 获取单个项目详情 |
| `POST` | `/api/scan` | 触发目录扫描 |
| `GET` | `/api/config` | 获取当前配置 |
| `PUT` | `/api/config` | 更新配置 |
| `POST` | `/api/open` | 执行快捷操作 |

### 5.2 端点详情

#### `GET /api/projects`

查询参数：`?search=xxx&type=React&tag=Frontend`

返回所有已扫描项目（含 Git 状态徽章和 README 摘要），支持搜索和筛选。

#### `GET /api/projects/:id`

返回单个项目完整详情：基本信息 + Git 状态 + README 全文（截断至 2000 字符）。

#### `POST /api/scan`

Body: `{}`（使用已配置的扫描目录）

触发完整扫描，更新 `projects.json`，返回扫描结果摘要。

#### `POST /api/open`

Body:
```json
{
  "projectId": "a1b2c3",
  "action": "vscode" | "terminal" | "folder" | "browser"
}
```

执行对应系统命令打开项目。

---

## 6. 前端组件设计

### 6.1 组件树

```
App
├── Sidebar
│   ├── Logo
│   ├── CategoryList
│   └── SettingsButton
├── MainContent
│   ├── SearchHeader
│   │   ├── SearchBar
│   │   └── ScanButton
│   ├── ProjectGrid
│   │   └── ProjectCard (×N)
│   │       ├── ProjectIcon
│   │       ├── GitStatusBadge
│   │       ├── ReadmeExcerpt
│   │       ├── TagList
│   │       └── QuickActions
│   └── EmptyState
├── ProjectDetail (modal/panel)
│   ├── ReadmeViewer
│   ├── GitDetail
│   └── ActionButtons
└── SettingsPanel (modal)
    └── ScanDirectoryEditor
```

### 6.2 关键交互

| 场景 | 行为 |
|------|------|
| 首次打开（无缓存） | 自动触发扫描，显示进度 |
| 扫描中 | 按钮转 loading，卡片区域显示骨架屏 |
| 扫描完成 | 显示项目数 + "上次扫描：X 分钟前" |
| 点击"Scan Now" | 重新扫描，增量更新 |
| 悬停项目卡片 | 显示完整 Git 状态 tooltip |
| 点击快捷操作按钮 | POST `/api/open`，后端拉起对应程序 |
| 搜索 | 前端本地过滤 + 后端模糊搜索结合 |

### 6.3 已有原型保留的部分

- 侧边栏分类筛选结构（改为动态标签）
- 项目卡片网格布局
- 搜索框
- 整体暗色视觉风格（stone-950 配色）
- motion 动画过渡

---

## 7. 扫描策略

### 7.1 扫描流程

```
1. 读取 config.json 中的 scanDirectories
2. 对每个目录，递归遍历（深度 ≤ scanDepth）
3. 发现特征文件（.git, package.json, etc.）则识别为项目
4. 与现有缓存对比：
   - 新项目 → 添加
   - 已有项目 → 更新 lastScanned
   - 缓存中有但磁盘中消失 → 标记为 stale（保留 7 天后删除）
5. 写入 projects.json
```

### 7.2 性能考量

- 扫描是同步阻塞操作（child_process.execSync），但在独立 API 端点，不影响 UI 响应
- 单次扫描预计 1-5 秒（取决于目录深度和文件数量）
- 项目数量预期 < 500，无需分页

---

## 8. 安全考量

- 后端仅监听 `127.0.0.1`（localhost），不暴露到局域网
- 快捷操作 (`POST /api/open`) 仅接受预定义 action 枚举值，防止命令注入
- 不执行任何用户传入的 shell 命令
- 扫描路径从配置读取，不接受 API 参数传入

---

## 9. 验收标准

### 9.1 项目扫描 (AC-SCAN)

| AC-SCAN-01 | 首次启动时，自动展示空状态引导页，提示用户配置扫描目录 |
| AC-SCAN-02 | 用户配置扫描目录后，点击"Scan"，后端 5 秒内返回扫描结果 |
| AC-SCAN-03 | 正确识别至少 6 种项目类型（React/Node/Go/Rust/Python/Java） |
| AC-SCAN-04 | 扫描发现的项目正确写入 `projects.json`，`id` 唯一且路径稳定 |
| AC-SCAN-05 | 重复扫描不会创建重复项目条目（基于路径去重） |
| AC-SCAN-06 | 磁盘上已删除的项目，连续 2 次扫描均未发现后标记为 stale |
| AC-SCAN-07 | 扫描过程中 UI 显示 loading 状态，不阻塞页面交互 |

### 9.2 项目列表展示 (AC-LIST)

| AC-LIST-01 | 首页以卡片网格展示所有已扫描项目，含名称、类型图标、路径、标签 |
| AC-LIST-02 | 每个项目卡片展示 Git 状态徽章（分支名 + 未提交文件数） |
| AC-LIST-03 | 每个项目卡片展示 README 前 200 字符摘要 |
| AC-LIST-04 | 项目为空时展示空状态，含引导文案 |
| AC-LIST-05 | 侧边栏按项目类型动态生成分类标签，显示各类型项目数 |

### 9.3 搜索与筛选 (AC-SEARCH)

| AC-SEARCH-01 | 搜索框输入关键词，前端实时过滤项目名称和标签（无需请求后端） |
| AC-SEARCH-02 | 侧边栏点击分类标签，筛选该类型的项目，高亮当前选中标签 |
| AC-SEARCH-03 | 搜索与分类筛选可叠加使用 |
| AC-SEARCH-04 | 无匹配结果时展示"未找到项目"空状态 |

### 9.4 快捷操作 (AC-ACTIONS)

| AC-ACTIONS-01 | 点击"VS Code"按钮，在项目路径下唤起 VS Code |
| AC-ACTIONS-02 | 点击"Terminal"按钮，在项目路径下打开系统终端 |
| AC-ACTIONS-03 | 点击"Folder"按钮，在文件管理器中打开项目目录 |
| AC-ACTIONS-04 | 操作失败时，显示具体错误提示（如"未安装 VS Code"） |
| AC-ACTIONS-05 | `POST /api/open` 拒绝非枚举值以外的 action 参数，返回 400 |

### 9.5 Git 状态 (AC-GIT)

| AC-GIT-01 | 非 Git 项目不显示 Git 状态徽章（不报错） |
| AC-GIT-02 | Git 项目正确显示当前分支名 |
| AC-GIT-03 | 有未提交更改时显示文件变更数（modified/added/deleted） |
| AC-GIT-04 | 有未推送提交时显示 ahead/behind 计数 |
| AC-GIT-05 | git 命令执行失败时不阻塞页面，降级显示"Git 状态不可用" |

### 9.6 README 预览 (AC-README)

| AC-README-01 | 存在 `README.md` 的项目，卡片展示前 200 字符摘要 |
| AC-README-02 | 不存在 README 的项目，不显示摘要区域（不报错） |
| AC-README-03 | 点击项目可展开详情面板，展示 README 全文（最多 2000 字符） |
| AC-README-04 | Markdown 内容以纯文本形式展示（v1.0 不做渲染） |

### 9.7 配置管理 (AC-CONFIG)

| AC-CONFIG-01 | 用户可通过设置面板添加/删除扫描目录 |
| AC-CONFIG-02 | 配置变更即时保存到 `config.json`，下次启动自动加载 |
| AC-CONFIG-03 | 配置了无效路径时，扫描跳过该路径并提示用户 |
| AC-CONFIG-04 | 首次启动无配置文件时，自动生成默认配置 |

### 9.8 跨平台兼容 (AC-PLATFORM)

| AC-PLATFORM-01 | macOS：正确使用 `open`、`code` 命令 |
| AC-PLATFORM-02 | Windows：正确使用 `start`、`code.cmd`、`wt.exe` |
| AC-PLATFORM-03 | Linux：正确使用 `xdg-open`、`code`、`gnome-terminal` |
| AC-PLATFORM-04 | 路径处理兼容各平台的分隔符和主目录展开（`~` → `$HOME`） |

### 9.9 生产构建 (AC-BUILD)

| AC-BUILD-01 | `npm run build` 生成前端静态文件 + 后端可执行脚本 |
| AC-BUILD-02 | 构建后单条命令 (`node server.js`) 即可运行完整应用 |
| AC-BUILD-03 | 生产模式不暴露 Vite dev server，Express 直接托管静态文件 |

---

## 10. 开发计划

### Phase 1: 后端核心 (Day 1-2)
- [ ] Express 服务器搭建 (TypeScript + tsx)
- [ ] Scanner 模块 — 目录扫描 + 项目发现
- [ ] Config Service — 配置读写
- [ ] Git Service — Git 状态查询
- [ ] Actions Service — 快捷操作执行
- [ ] API Routes — 所有端点

### Phase 2: 前后端连接 (Day 3)
- [ ] Vite proxy 配置
- [ ] 前端 API 调用层（替代 mock 数据）
- [ ] 扫描/加载状态处理
- [ ] 错误处理

### Phase 3: UI 增强 (Day 4)
- [ ] GitStatusBadge 组件
- [ ] ReadmeExcerpt 组件
- [ ] QuickActions 接通真实功能
- [ ] ProjectDetail 面板
- [ ] Settings 面板
- [ ] 骨架屏 / 空状态

### Phase 4: 打磨 (Day 5)
- [ ] 跨平台兼容测试
- [ ] 错误边界和容错
- [ ] 生产构建脚本
- [ ] README 更新
