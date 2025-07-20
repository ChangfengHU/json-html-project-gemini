# JSON to HTML 转换工具技术方案文档 (TSD)

## 1. 概述

本文档旨在为 "JSON to HTML 转换工具" 提供技术设计方案。该工具的核心目标是实现一个健壮、可扩展的转换器，能够将动态的、甚至是流式的 JSON 数据高效地渲染成结构化的 HTML。

核心挑战与设计要点：
- **处理流式和不完整数据**: 保证在数据不完整的情况下也能进行最大努力的解析和渲染。
- **解耦与可扩展性**: 数据结构、模板和渲染逻辑必须解耦，通过 "布局" 和 "块" 的概念实现模块化，方便未来扩展新的 JSON 类型和样式。
- **状态感知**: 转换器需具备状态机能力，能够识别当前在 JSON 结构中的位置，并对下一步进行预测。

---

## 2. 核心概念与架构

我们将系统设计为由以下几个核心概念驱动：

- **布局 (Layout)**: 一个完整的模板方案，与 JSON 数据中的 `type` 字段一一对应（例如 `type: "行程规划"` 对应 `trip-plan-layout`）。布局定义了页面将包含哪些 **块 (Block)** 以及它们的排列顺序。

- **块 (Block / Node)**: 构成布局的基本单元。每个块负责渲染 JSON 数据中的一个特定部分（例如 `overview` 对象或 `days` 数组）。它定义了：
    1.  **标识符**: 唯一的名称（如 `overview`, `daysList`）。
    2.  **匹配器 (Matcher)**: 一个函数或规则，用于判断当前的 JSON 片段是否属于这个块。
    3.  **渲染器 (Renderer)**: 一个函数，接收块对应的 JSON 数据，并输出相应的 HTML 字符串。

- **JSON 补全器 (JSON Completer)**: 一个工具模块，当接收到不完整的 JSON 字符串时，它会尝试通过算法（如堆栈匹配 `{}`, `[]`）将其补全为一个语法有效的 JSON。

- **流处理器 (Stream Processor)**: 整个工具的核心引擎。它接收 JSON 数据流，调用 **JSON 补全器**，识别 **布局** 和 **块**，并按顺序调用 **渲染器** 生成最终的 HTML。

### 架构图

```
[JSON Stream] -> [Stream Processor]
                     |
         +-----------+-----------+
         |                       |
  [JSON Completer]        [State Tracker]
         |                       |
  [Parsed JSON]         (Current Layout, Current Block)
         |                       |
         +-----------+-----------+
                     |
              [Layout Manager] --(uses `type`)--> [Selected Layout]
                     |
         [Block Renderer 1] ... [Block Renderer N]
                     |
              [Generated HTML Fragments]
                     |
                  [HTML Assembler]
                     |
                 [Final HTML]
```

---

## 3. 数据结构定义 (TSD)

我们将使用 TypeScript 风格的定义来清晰地描述各个模块的接口。

```typescript
/**
 * 定义了一个渲染块的行为
 */
interface IBlock {
    // 块的唯一标识符, e.g., "overview", "daysList"
    id: string;

    // 匹配器：判断给定的 JSON key 是否属于这个块
    // e.g., (key) => key === 'overview'
    matcher: (jsonKey: string) => boolean;

    // 渲染器：接收匹配到的 JSON 数据片段，返回 HTML 字符串
    // e.g., (data) => `<div>...</div>`
    renderer: (data: any) => string;

    // 定义下一个可能的块的 id 列表，用于预测
    // e.g., ['daysList', 'notes']
    nextPossibleBlocks: string[];
}

/**
 * 定义了一个布局方案
 */
interface ILayout {
    // 布局名称，与 JSON 的 `type` 字段对应
    // e.g., "行程规划"
    name: string;

    // 该布局包含的块的有序列表，定义了渲染的顺序
    blocks: IBlock[];
}

/**
 * 流处理器的当前状态
 */
interface IProcessorState {
    // 当前识别到的布局
    currentLayout: ILayout | null;

    // 当前处理到的块
    currentBlock: IBlock | null;

    // 预测下一个可能的块
    nextExpectedBlock: IBlock | null;

    // 已经处理过的 JSON key
    processedKeys: Set<string>;

    // 生成的 HTML 片段
    htmlOutput: string;
}

/**
 * 模板注册表，用于存储和管理所有布局
 */
interface ITemplateRegistry {
    // 注册一个新布局
    register(layout: ILayout): void;

    // 根据 JSON type 查找布局
    findLayoutFor(type: string): ILayout | undefined;
}
```

---

## 4. 工作流程

1.  **初始化**: 创建 `StreamProcessor` 实例，并向 `TemplateRegistry` 注册所有可用的 `ILayout` 定义。

2.  **接收数据**: `StreamProcessor` 接收一个 JSON 字符串（可能是残缺的）。
    ```javascript
    processor.process(jsonChunk);
    ```

3.  **补全 JSON**: `StreamProcessor` 将新的 `jsonChunk` 与内部缓冲的字符串合并，然后调用 `JsonCompleter`。
    -   `JsonCompleter` 使用基于堆栈的括号匹配算法，尝试闭合所有未关闭的 `[` 和 `{`。
    -   如果补全失败（例如，基本语法错误），则记录错误并等待更多数据。
    -   如果成功，进入下一步。

4.  **解析和识别布局**:
    -   使用 `JSON.parse()` 解析补全后的 JSON 字符串。
    -   读取顶层的 `type` 字段。
    -   调用 `TemplateRegistry.findLayoutFor(type)` 获取对应的 `ILayout`。如果未找到，则抛出错误。
    -   更新状态 `IProcessorState.currentLayout`。

5.  **按块迭代和渲染**:
    -   `StreamProcessor` 遍历解析后的 JSON 对象的顶级 `keys`（例如 `["type", "routeTitle", "overview", "days"]`）。
    -   对于每个 `key`，它会遍历 `currentLayout.blocks` 列表。
    -   使用 `block.matcher(key)` 找到第一个匹配的 `IBlock`。
    -   一旦找到匹配的块：
        a.  如果该 `key` 尚未处理，则调用 `block.renderer(jsonData[key])` 生成 HTML 片段。
        b.  将生成的 HTML 追加到 `IProcessorState.htmlOutput`。
        c.  更新状态：`currentBlock` 设置为当前块，`nextExpectedBlock` 根据 `currentBlock.nextPossibleBlocks` 更新。
        d.  将 `key` 记录到 `processedKeys` 集合中，防止重复渲染。

6.  **输出**:
    -   `processor.getHtml()`: 返回当前已生成的完整 HTML。
    -   `processor.getState()`: 返回当前的 `IProcessorState`，包含了识别到的布局、当前块和下一个预测块的信息。

---

## 5. 示例：行程规划模板定义

根据您提供的 `one-plan.json`，我们可以这样定义一个布局文件。

**file: `templates/trip-plan-layout.js`**
```javascript
const tripPlanLayout = {
    name: "行程规划",
    blocks: [
        {
            id: "routeTitle",
            matcher: (key) => key === 'routeTitle',
            renderer: (title) => `<h1>${title}</h1>`,
            nextPossibleBlocks: ['overview']
        },
        {
            id: "overview",
            matcher: (key) => key === 'overview',
            renderer: (overviewData) => `
                <div class="overview">
                    <span>天数: ${overviewData.days}</span>
                    <span>玩法: ${overviewData.play}</span>
                    <span>预算: ${overviewData.budget}</span>
                </div>
            `,
            nextPossibleBlocks: ['days']
        },
        {
            id: "days",
            matcher: (key) => key === 'days',
            renderer: (daysArray) => {
                const dayItems = daysArray.map(day => `
                    <div class="day-item">
                        <h3>${day.dayNum}</h3>
                        <p>${day.description}</p>
                    </div>
                `).join('');
                return `<div class="days-container">${dayItems}</div>`;
            },
            nextPossibleBlocks: [] // 假设这是最后一个块
        }
    ]
};

// 导出以便注册
export default tripPlanLayout;
```

这份 TSD 为后续的开发工作提供了清晰现在的蓝图和接口定义，确保了项目在设计上的严谨性和可扩展性。
