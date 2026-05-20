---
name: projecthub-startup-scripts
description: ProjectHub startup script modifications and fixes
metadata:
  type: project
---

# ProjectHub 启动脚本修改记录

## 问题与修复

### start.ps1 (PowerShell)

**问题：** `$PSScriptRoot` 指向 `scripts` 目录，导致检查 `node_modules` 时路径错误

**修复：** 改为 `Split-Path -Parent $PSScriptRoot` 获取项目根目录

### start.sh (Bash/Mac/Linux)

**问题 1：** 依赖检查时路径错误，`node_modules` 在项目根目录而非 scripts 目录

**问题 2：** 使用 `npm run dev:server` 时 node 子进程找不到 path

**问题 3：** Git Bash on Windows 没有 `lsof` 命令

**问题 4：** `lsof -ti:13001 | xargs kill -9` 当 lsof 无输出时 xargs 报错

**问题 5：** 使用 `kill -9` 无法终止 Windows 原生进程（PID 格式不兼容）

**修复：**
1. 使用绝对路径调用 `node_modules/tsx/dist/cli.mjs` 和 `node_modules/vite/bin/vite.js`
2. Windows 环境检测：用 `netstat` + `taskkill //F //PID` 替代 `lsof` + `kill -9`
3. 添加 `read` 等待用户按键防止窗口闪退

### start.cmd (已删除)

Windows 用户使用 `start.ps1` 即可，不再需要 `.cmd` 脚本

## 启动脚本现状

| 平台 | 脚本 | 功能 |
|------|------|------|
| Windows | `scripts/start.ps1` | 自动检查依赖、清理端口、启动前后端 |
| Mac/Linux | `scripts/start.sh` | 自动检查依赖、清理端口、启动前后端 |

## 关键实现细节

### 端口清理逻辑（跨平台）

```bash
# Windows Git Bash
netstat -ano | grep ":13001 " | grep LISTENING | awk '{print $NF}' | xargs kill -9
# 实际使用 taskkill //F //PID

# macOS/Linux
lsof -ti:13001 | xargs kill -9
```

### 启动命令

```bash
# 后端
NODE_BIN/node NODE_BIN/../node_modules/tsx/dist/cli.mjs server/index.ts

# 前端
NODE_BIN/node NODE_BIN/../node_modules/vite/bin/vite.js --port=13000
```

### 依赖检查

1. 检查 `node_modules` 目录是否存在
2. 不存在则自动执行 `npm install`
3. 检查 `tsx` 和 `vite` 包是否存在，缺失也执行 `npm install`