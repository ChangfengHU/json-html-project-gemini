# JSON to HTML 渲染引擎使用文档

这是一个功能强大且易于集成的渲染引擎，可以将结构化的 JSON 数据自动转换为丰富的 HTML 页面。它通过动态加载与 JSON `type` 匹配的布局模板来实现，具有高度的可扩展性。

## 快速开始：三步集成

### 第 1 步：复制核心文件

将本项目中的 `public` 目录下的 `js` 文件夹和根目录下的 `templates` 文件夹，完整地复制到您自己项目（例如 Vue、React 项目）的 `public` 目录下。

您的项目目录结构应该如下所示：

```
my-vue-app/
├── public/
│   ├── js/          <-- 复制过来的整个文件夹
│   │   ├── JsonHtmlFactory.js
│   │   ├── JsonHtmlConverter.js
│   │   └── layout.config.js
│   └── templates/   <-- 复制过来的整个文件夹
│       ├── park-plan/
│       └── trip-plan/
├── src/
│   └── ...
└── package.json
```

**重要**：文件必须放在 `public` 目录下，这样它们才能在运行时被浏览器通过 URL 访问到。

### 第 2 步：在您的代码中调用工厂

在您需要进行转换的地方（例如 Vue 组件中），导入并使用 `jsonHtmlFactory`。

```javascript
// 在您的 Vue 组件中 (e.g., src/components/JsonRenderer.vue)

import { jsonHtmlFactory } from '/js/JsonHtmlFactory.js';

// ...

async function renderJson(jsonString) {
  try {
    // 这是唯一需要调用的方法！
    const htmlResult = await jsonHtmlFactory.create(jsonString);
    
    // 现在可以将 htmlResult 设置到您的组件数据中，并用 v-html 渲染
    this.htmlContent = htmlResult;

  } catch (error) {
    console.error("渲染失败:", error);
    // 可以在 UI 上显示错误信息
    this.error = error.message;
  }
}
```

### 第 3 步：提供 JSON 数据

您只需要提供一个包含 `type` 字段的 JSON 字符串。工厂会根据 `type` 的值自动查找并加载对应的布局。

**示例 JSON:**

```json
{
  "type": "行程规划",
  "title": "探索京都的七日之旅",
  "summary": {
    "destination": "日本, 京都",
    "days": 7
  },
  // ... 其他数据
}
```

当您将此 JSON 字符串传递给 `jsonHtmlFactory.create()` 方法时，它会自动加载 `/templates/trip-plan/layout.js` 并进行渲染。

## 如何扩展

扩展渲染引擎以支持新的布局非常简单：

1.  **创建新模板**：在 `public/templates/` 目录下，为您的新类型创建一个新的文件夹，例如 `my-new-layout/`，并在其中创建一个 `layout.js` 文件。

2.  **更新配置**：打开 `public/js/layout.config.js` 文件，添加一行新的映射。

    ```javascript
    // public/js/layout.config.js
    export const LAYOUT_CONFIG = {
      "行程规划": "/templates/trip-plan/layout.js",
      "园区内规划": "/templates/park-plan/layout.js",
      "我的新类型": "/templates/my-new-layout/layout.js" // <-- 添加这一行
    };
    ```

完成！现在，当您提供 `type` 为 `"我的新类型"` 的 JSON 时，工厂将自动使用您的新布局进行渲染。无需修改任何核心逻辑代码。