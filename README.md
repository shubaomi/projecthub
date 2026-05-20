# ProjectHub

本地开发项目管理工作区 — 自动扫描本地目录中的开发项目，集中展示项目信息（类型、标签、Git 状态、README 摘要），提供一键打开 IDE/终端的快捷操作。

![ProjectHub](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## 功能特性

- **自动项目发现** — 递归扫描指定目录，自动识别项目类型（React、Vue、Next.js、Go、Rust、Python、Java 等）
- **Git 状态概览** — 显示当前分支、未提交文件数、ahead/behind 计数
- **分支列表展示** — 查看仓库所有本地分支
- **README 预览** — 卡片展示摘要，详情面板展示全文
- **一键快捷操作** — 快速打开 VS Code、Cursor、Trae 等 IDE、终端或文件管理器
- **自定义分类** — 创建自定义分类组织项目（支持颜色标记）
- **国际化** — 支持中文和英文界面
- **跨平台** — 支持 Windows、macOS、Linux

## 快速开始

### 方式一：使用启动脚本（推荐）

双击运行对应平台的启动脚本：

| 平台 | 脚本 | 说明 |
|------|------|------|
| Windows | `scripts/start.ps1` | PowerShell 脚本，自动安装依赖并启动 |
| macOS / Linux | `scripts/start.sh` | Bash 脚本，自动安装依赖并启动 |

启动后访问：
- 前端：http://localhost:13000
- 后端：http://localhost:13001

按 `Ctrl+C` 停止服务。

### 方式二：手动启动

```bash
# 安装依赖
npm install

# 启动后端（终端 1）
npm run dev:server

# 启动前端（终端 2）
npm run dev -- --port=13000
```

打开 http://localhost:13000，首次使用需要在设置中配置扫描目录。

## 配置说明

### 扫描目录

在设置面板中添加要扫描的目录路径，支持使用 `~` 表示主目录：

```
~/Workspace
~/Projects
~/Documents/code
```

### 自定义分类

创建自定义分类来组织项目，例如：
- 工作项目（橙色标记）
- 个人项目（绿色标记）
- 开源贡献（蓝色标记）

### 首选 IDE

设置默认打开的 IDE（VS Code、Cursor、Trae、CodeBuddy 等），系统 PATH 中有的命令都可以使用。

### 语言

支持中文和英文界面切换。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| 后端 | Express 4 + TypeScript (tsx) |
| 动画 | motion (framer-motion) |
| 图标 | lucide-react |
| 数据存储 | JSON 文件 (`~/.projecthub/`) |

## 项目结构

```
projecthub/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── hooks/              # 数据 hooks
│   ├── api/                # API 客户端
│   ├── i18n/               # 国际化词典
│   └── types.ts            # 前端类型定义
├── server/                 # 后端源码
│   ├── services/            # 业务服务
│   │   ├── scanner.ts      # 项目扫描
│   │   ├── git.ts          # Git 状态
│   │   ├── actions.ts      # 快捷操作
│   │   ├── config.ts       # 配置管理
│   │   └── ides.ts         # IDE 列表
│   ├── routes/             # API 路由
│   └── types.ts            # 后端类型定义
├── scripts/                # 启动脚本
│   ├── start.ps1          # Windows 启动脚本
│   └── start.sh            # macOS/Linux 启动脚本
└── docs/                  # 设计文档
```

## API 端点

| Method | Path | 描述 |
|--------|------|------|
| `GET` | `/api/projects` | 获取项目列表 |
| `GET` | `/api/projects/:id` | 获取项目详情（含 README 全文） |
| `POST` | `/api/scan` | 触发目录扫描 |
| `GET` | `/api/config` | 获取配置 |
| `PUT` | `/api/config` | 更新配置 |
| `POST` | `/api/open` | 执行快捷操作 |
| `GET` | `/api/ides` | 获取可用 IDE 列表 |

## 开发

```bash
# 类型检查
npm run lint

# 构建生产版本
npm run build:all
```

## 许可证

MIT