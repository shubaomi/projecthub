---
name: projecthub-doc-update-2026-05-20
description: Fourth round of doc updates — custom category UX, scanner behavior, API endpoints, component tree
metadata:
  type: project
---

# ProjectHub 文档更新记录 2026-05-20

## 触发原因

用户要求运行 `/dev-cmd-update-docs-by-code` 同步代码与文档，此前完成了：
- 自定义分类 UX 修复（ProjectCard 标签 + ProjectDetail 下拉选择器）
- handleCategoryChange 性能优化（refresh 代替 scan）

## 发现的文档与实际代码的出入点

### design.md

| 位置 | 文档描述 | 实际代码 | 修正 |
|------|----------|----------|------|
| §7.1 步骤4 | 标记 stale 后 7 天删除 | 立即从缓存删除 | ✅ 已修正 |
| §8 安全 | 仅接受预定义枚举 action | 接受动态 IDE 命令字符串 | ✅ 已修正 |
| §9.4 AC-ACTIONS-05 | 拒绝非枚举值返回 400 | 缺失参数才返回 400 | ✅ 已修正 |
| §9.6 AC-README-03 | README 全文截断至 2000 字符 | 无截断，最大高度 60vh | ✅ 已修正 |
| §4.5 特征文件 | 含 `.sln`、`CMakeLists.txt` | scanner.ts 未检测这些 | ✅ 已修正 |
| §5.1 API 端点 | 无 category 端点 | 有 `PATCH /api/projects/:id/category` | ✅ 补充 |
| §6.1 组件树 | 缺少 LanguageSwitcher、CategoryBadge 等 | 已实现 | ✅ 重写 |
| §4.2 config.json | customCategories 结构 | 正确（无需修改） | — |

### iteration-1.md

| 位置 | 文档描述 | 实际代码 | 修正 |
|------|----------|----------|------|
| §4.1 config.json 示例 | `customCategories: string[]` | `CategoryDefinition[]`（含 id/name/color） | ✅ 已修正 |
| §4.3 API | 含 `POST /api/categories`、`DELETE /api/categories/:name` | 不存在 | ✅ 删除 |

### iteration-4.md

刚撰写，与实际实现一致。

## 未被文档覆盖的功能

- `LanguageSwitcher` 组件（SearchHeader 内嵌语言切换）
- 自定义分类在 ProjectCard 上的彩色标签显示
- ProjectDetail 的下拉选择器替代按钮组
- handleCategoryChange 使用 refresh() 而非 scan()

## 相关记忆

[[projecthub-startup-scripts]]
