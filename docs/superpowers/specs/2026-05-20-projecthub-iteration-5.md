# ProjectHub — 第五轮迭代修复

> 自定义分类功能增强 · 2026-05-21

---

## 问题概述

本轮三个问题均围绕自定义分类功能的可用性提升：侧边栏布局、分类重命名、拖拽排序。

---

## Issue 1: 侧边栏视觉美观 — 双滚动条问题

### 现象

当用户创建了大量自定义分类后，侧边栏出现不美观的双区域滚动：自定义分类区域无滚动条直接撑大，将"技术栈"区域压缩到只剩很小的可视空间，并在技术栈区域内出现一个独立的滚动条。

### 根因分析

文件：`src/components/Sidebar.tsx:25-74`

当前布局结构：

```
<div className="flex flex-col">              ← 固定高度 h-screen（继承自 App）
  Logo                    ← 固定
  Custom Categories       ← 无 overflow 限制，可无限撑大
  Tech Stack              ← flex-1 overflow-y-auto（被挤压后出现滚动条）
  Settings                ← 固定
</div>
```

关键 CSS：
- 第 55 行：技术栈容器 `flex-1 overflow-y-auto` — 占据剩余空间，溢出时独立滚动
- 第 38 行：自定义分类容器仅有 `px-3 space-y-1` — **无高度限制、无 overflow**

当自定义分类只有 2-3 个时问题不明显。但达到 10+ 个时，自定义分类区域占据了侧边栏 70%+ 的高度，技术栈被压缩成很小一块带着自己的滚动条 —— 视觉上像"一扇窗户里套了另一扇窗户"。

### UX 分析

| 场景 | 当前表现 | 问题 |
|------|----------|------|
| 2-3 个分类 | 正常 | — |
| 8-10 个分类 | 技术栈区域被挤压，出现双滚动条 | 视觉混乱，用户不知道哪里可以滚动 |
| 15+ 个分类 | 技术栈几乎不可见 | 严重破坏可用性 |

### 修复方案

**方案：单滚动区域**

将自定义分类和技术栈包裹在同一个 `flex-1 overflow-y-auto` 容器中，整体统一滚动：

```
┌─────────────────┐
│  📁 ProjectHub  │  ← 固定
├─────────────────┤
│                 │
│  自定义分类      │  ← 整体滚动区域
│  ├ 🟠 工作 (3)  │     当内容过多时
│  ├ 🟢 个人 (2)  │     整个区域一起滚动
│  ├ 🔵 开源 (1)  │
│  └ ...          │
│                 │
│  技术栈          │
│  ├ React (5)    │
│  ├ Go (3)       │
│  └ ...          │
│                 │
├─────────────────┤
│  ⚙ 设置         │  ← 固定
└─────────────────┘
```

代码变化（Sidebar.tsx）：

```tsx
<div className="w-64 border-r border-stone-800 bg-stone-950/50 flex flex-col">
  {/* Logo — 固定顶部 */}
  <div className="p-6">...</div>

  {/* 统一滚动区域 */}
  <div className="flex-1 overflow-y-auto px-3">
    {customCategories.length > 0 && (
      <>
        <div className="px-1 py-2 text-xs ...">Custom Categories</div>
        <div className="space-y-1">
          {customCategories.map(...)}
        </div>
      </>
    )}
    <div className="px-1 py-2 text-xs ...">Tech Stack</div>
    <div className="space-y-1">
      {techStack.map(...)}
    </div>
  </div>

  {/* Settings — 固定底部 */}
  <div className="p-4 border-t border-stone-800">...</div>
</div>
```

不需要新增依赖，纯 CSS 结构调整。Logo 和 Settings 始终可见，中间内容统一滚动。

---

## Issue 2: 自定义分类名称不可修改

### 现象

当前自定义分类创建后，名称无法编辑。用户想改名时只能：
1. 删除该分类 → 项目中该分类关联丢失
2. 新建一个分类（新名称）
3. 逐个找到之前属于旧分类的项目，重新分配到新分类

### 根因分析

文件：`src/components/SettingsPanel.tsx:55-62`

当前 SettingsPanel 分类列表只提供"添加"和"删除"操作，没有"编辑"功能：

```tsx
function handleAddCategory() {
    const trimmed = newCatName.trim()
    if (!trimmed) return
    const id = trimmed.toLowerCase().replace(/\s+/g, '-')
    setCustomCategories([...customCategories, { id, name: trimmed, color: newCatColor }])
}
```

每个分类项只显示名称 + 颜色 + 删除按钮：

```tsx
// SettingsPanel.tsx:146-155
{customCategories.map((cat) => (
  <div key={cat.id} className="flex items-center justify-between ...">
    <span>
      <Palette color={cat.color} />
      {cat.name}
    </span>
    <button onClick={() => handleRemoveCategory(cat.id)}>
      <Trash2 />
    </button>
  </div>
))}
```

### 关键设计决策：id 稳定性

`CategoryDefinition` 结构：

```typescript
interface CategoryDefinition {
  id: string    // 由名称自动生成，如 "work-project" → "work-project"
  name: string  // 显示名称，如 "工作项目"
  color: string // 颜色值，如 "#f97316"
}
```

项目引用分类时存储的是 `id`（`project.customCategory = "work-project"`）。

**重要设计决策**：修改名称时**不改变 `id`**。这样：
- 项目中 `customCategory` 引用自动保持有效（因为 `id` 不变）
- 无需批量更新项目数据
- 只需修改 `config.json` 中的 `customCategories` 数组

当前 `id` 生成逻辑在 SettingsPanel 中（第 62 行）：
```tsx
const id = trimmed.toLowerCase().replace(/\s+/g, '-')
```

这个 `id` 在创建后就是不可变的标识符，名称改变不影响它。

### 修复方案

**SettingsPanel 增加行内编辑功能：**

每个分类行增加编辑按钮（铅笔图标），点击后名称变为可编辑的 input 框：

```
正常状态：
┌────────────────────────────────────┐
│ 🟠 工作项目               ✏️  🗑️  │
└────────────────────────────────────┘

编辑状态：
┌────────────────────────────────────┐
│ 🟠 [____工作项目____]      ✓  ✕   │
└────────────────────────────────────┘
```

交互流程：
1. 点击 ✏️ 进入编辑模式 → 输入框自动聚焦并全选文字
2. 修改名称 → 按 Enter 或点击 ✓ 确认
3. 调用 `handleRenameCategory(id, newName)` 更新本地状态（只改 `name`，不改 `id`）
4. 点击 Save 保存到 `config.json`
5. 侧边栏、项目卡片上的分类标签自动更新（因为读取同一 `config` 源）

编辑状态下显示验证规则：
- 名称不能为空
- 名称不能与已有分类重名（大小写不敏感）

需要新增的本地状态：
```tsx
const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
const [editName, setEditName] = useState('')
```

代码骨架：
```tsx
function handleStartEdit(cat: CategoryDefinition) {
  setEditingCategoryId(cat.id)
  setEditName(cat.name)
}

function handleConfirmRename() {
  const trimmed = editName.trim()
  if (!trimmed) return
  if (customCategories.some(c => c.id !== editingCategoryId && c.name.toLowerCase() === trimmed.toLowerCase())) {
    setError('Category already exists')
    return
  }
  setCustomCategories(customCategories.map(c =>
    c.id === editingCategoryId ? { ...c, name: trimmed } : c
  ))
  setEditingCategoryId(null)
}
```

---

## Issue 3: 拖拽排序 — 侧边栏与设置面板同步

### 现象

自定义分类没有排序机制，只能按创建顺序排列。用户想要调整分类在侧边栏和设置面板中的显示顺序，但无法操作。

### 根因分析

`customCategories` 是数组，顺序由添加顺序决定。侧边栏和 SettingsPanel 都按数组原始顺序渲染：

```tsx
// Sidebar.tsx:40
{customCategories.map((cat) => (...))}

// SettingsPanel.tsx:146
{customCategories.map((cat) => (...))}
```

两者都从同一个数据源 `config.customCategories` 读取，所以天然同步——但它们都是只读渲染，没有任何方式改变顺序。

### 设计决策：数组顺序即显示顺序

不在 `CategoryDefinition` 中增加 `order` 字段，直接以数组索引作为排序依据。理由：
- 避免 `order` 字段与实际数组位置不一致的同步问题
- 修改顺序只需调整数组元素位置，与 `PUT /api/config` 天然兼容
- 简单直接，不引入额外的排序逻辑

### 实现方案：HTML5 原生拖拽

不引入第三方拖拽库（如 `@dnd-kit`），使用浏览器原生 Drag and Drop API。理由：
- 拖拽场景简单（单列列表，仅上下移动）
- 零额外依赖体积
- 浏览器兼容性良好（Chrome/Firefox/Edge/Safari 均支持 HTML5 DnD）

#### 拖拽交互设计

**侧边栏（Sidebar）：**

```
拖拽前：
  自定义分类
  ├ 🟠 工作项目 (3)     ← 拖拽手柄在左侧
  ├ 🟢 个人项目 (2)
  └ 🔵 开源贡献 (1)

拖拽中：
  自定义分类
  ├ ═══ 放置指示线 ═══   ← 视觉反馈，半透明
  ├ 🟢 个人项目 (2)        ← 被拖拽项，半透明
  └ 🔵 开源贡献 (1)
```

- 每个分类项的 Tag 图标作为隐式拖拽手柄（不需要额外 UI）
- 拖拽时被拖拽项变半透明（`opacity-50`）
- 目标位置显示蓝色插入指示线
- 释放后立即更新本地顺序并保存

**设置面板（SettingsPanel）：**

```
拖拽前：
  ┌──────────────────────────────────┐
  │ ≡ 🟠 工作项目             ✏️ 🗑️ │  ← ≡ 是拖拽手柄
  │ ≡ 🟢 个人项目             ✏️ 🗑️ │
  │ ≡ 🔵 开源贡献             ✏️ 🗑️ │
  └──────────────────────────────────┘
```

- 每条最左侧显示 `GripVertical` 图标（`≡`）作为显式拖拽手柄
- 拖拽行为与侧边栏一致

#### 数据流设计

```
配置: config.customCategories = [A, B, C]

Sidebar                           SettingsPanel
  读取: [A, B, C]                   读取: [A, B, C]
     │                                  │
     │ 用户拖拽 B → C 前面              │
     ▼                                  │
  onReorder([A, C, B])                  │
     │                                  │
     └─→ App.handleReorderCategories   │
          │                              │
          └─→ saveConfig({               │
                customCategories:         │
                  [A, C, B]              │
              })                         │
          │                              │
          └─→ 后端 PUT /api/config      │
          │                              │
          └─→ config 状态更新            │
               │                         │
               ├─→ Sidebar 重渲染 [A,C,B]
               └─→ SettingsPanel 重渲染 [A,C,B]
```

两个组件都从 `config.customCategories` 读取，拖拽后保存到同一个 config，自然实现实时同步。

#### 需要新增的 props

**Sidebar** — 新增 `onReorderCategories` prop：
```typescript
interface SidebarProps {
  // ... 现有 props
  onReorderCategories: (categories: CategoryDefinition[]) => void
}
```

**App.tsx** — 新增处理函数：
```typescript
const handleReorderCategories = useCallback(async (categories: CategoryDefinition[]) => {
  await saveConfig({ customCategories: categories })
}, [saveConfig])
```

**SettingsPanel** — 不需要新增 props，已有 `onSave`，在 `handleSave` 中保存重排后的 `customCategories`。

#### 拖拽实现要点

```tsx
// 拖拽状态
const [dragIndex, setDragIndex] = useState<number | null>(null)
const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

function handleDragStart(index: number) {
  setDragIndex(index)
}

function handleDragOver(e: React.DragEvent, index: number) {
  e.preventDefault()
  setDragOverIndex(index)
}

function handleDrop(index: number) {
  if (dragIndex === null || dragIndex === index) return
  const reordered = [...categories]
  const [removed] = reordered.splice(dragIndex, 1)
  reordered.splice(index, 0, removed)
  onReorderCategories(reordered)
  setDragIndex(null)
  setDragOverIndex(null)
}
```

每个分类按钮添加 `draggable` 属性和事件处理器：
```tsx
<div
  draggable
  onDragStart={() => handleDragStart(index)}
  onDragOver={(e) => handleDragOver(e, index)}
  onDrop={() => handleDrop(index)}
  onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
  className={`... ${dragIndex === index ? 'opacity-50' : ''}`}
>
```

---

## 改动清单

| Issue | 前端改动 | 后端改动 | i18n |
|-------|----------|----------|------|
| #1 侧边栏单滚动区域 + 技术栈折叠 | `Sidebar.tsx` — 统一滚动 + ChevronDown 可折叠收起 | — | — |
| #2 分类名称可编辑 | `SettingsPanel.tsx` — 行内编辑（Pencil → input → Check/X） | — | — |
| #3 拖拽排序 | `Sidebar.tsx` + `SettingsPanel.tsx` + `App.tsx` — HTML5 DnD | — | — |

**后端无需改动**：`customCategories` 已通过 `PUT /api/config` 整存整取，支持任意顺序和名称修改。

---

## 实现优先级

| 优先级 | Issue | 状态 |
|--------|-------|------|
| P0 | #1 侧边栏单滚动区域 + 技术栈折叠 | ✅ 已实现 |
| P1 | #2 分类可重命名 | ✅ 已实现 |
| P2 | #3 拖拽排序 | ✅ 已实现 |

