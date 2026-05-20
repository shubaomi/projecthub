---
name: projecthub-doc-update-2026-05-21
description: Fifth round of doc updates — iteration-5 UX fixes, project sorting, tech stack collapse, component tree updates
metadata:
  type: project
---

# ProjectHub 文档更新记录 2026-05-21

## 触发原因

本次开发实现了 iteration-5 的三个 UX 修复，并额外增加了两个功能：项目按更新时间排序、技术栈折叠。需要同步文档。

## 发现的文档与实际代码的出入点

### design.md

| 位置 | 文档描述 | 实际代码 | 修正 |
|------|----------|----------|------|
| §6.1 组件树 | `CustomCategoryEditor` 无标注 | 无行内重命名/拖拽说明 | ✅ 补充标注 |
| §6.1 组件树 | `TechStackList` 无折叠说明 | 可折叠收起，有自定义分类时默认收起 | ✅ 补充说明 |
| §9.2 AC-LIST-06 | 无排序规则 | 项目按 `lastModified` 降序排序 | ✅ 新增 AC-LIST-06 |
| §9.1 AC-SCAN-06 | "连续 2 次扫描均未发现后标记为 stale" | 立即从缓存移除（不等 2 次） | ✅ 已修正 |

### iteration-5.md

| 位置 | 文档描述 | 实际代码 | 修正 |
|------|----------|----------|------|
| §改动清单 #1 | 仅有"侧边栏单滚动区域" | 实际还包含技术栈折叠收起功能 | ✅ 合并说明 |
| §实现优先级 | 无状态标注 | 三个 issue 均已实现 | ✅ 标注为 ✅ 已实现 |

## 未被文档覆盖的功能

- 侧边栏技术栈可折叠（`techStackOpen` state，ChevronDown 图标，有自定义分类默认收起）
- 项目按 `lastModified` 降序排序（相同时间按 name 升序）
- SettingsPanel 分类项有 `GripVertical` 拖拽手柄
- SettingsPanel 编辑模式下禁止拖拽（`draggable={editingCategoryId !== cat.id}`）

## 实际实现详情（重要）

### 侧边栏技术栈折叠

```tsx
// Sidebar.tsx
const [techStackOpen, setTechStackOpen] = useState(customCategories.length === 0)
```

- 有自定义分类 → 默认收起
- 无自定义分类 → 默认展开
- 技术栈区域有 ChevronDown 图标，点击切换展开/收起

### 项目排序

```tsx
// App.tsx filteredProjects
return result.sort((a, b) => {
  const timeCmp = b.lastModified.localeCompare(a.lastModified)
  if (timeCmp !== 0) return timeCmp
  return a.name.localeCompare(b.name)
})
```

- 主排序：`lastModified` 降序
- 辅排序：`name` 升序（时间相同则按名称）

### 分类拖拽排序

- **Sidebar**：拖拽结束后立即调用 `onReorderCategories` 保存
- **SettingsPanel**：拖拽只更新本地 state，点击 Save 才保存
- 技术栈分类不支持拖拽（只有自定义分类可以）
- 编辑状态下禁止拖拽（`draggable={editingCategoryId !== cat.id}`）

## 相关记忆

[[projecthub-doc-update-2026-05-20]]