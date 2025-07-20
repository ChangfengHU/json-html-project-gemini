/**
 * @file config.js
 * @description 应用的全局配置文件。
 * 这个文件定义了 JSON `type` 到其对应布局模块文件路径的映射。
 * 这是整个动态加载机制的核心。
 */

const LAYOUT_CONFIG = {
  "行程规划": "templates/trip-plan/layout.js",
  "园区内规划": "templates/park-plan/layout.js"
  // 未来要支持新的类型，只需在这里添加一行映射即可。
  // 例如: "商场导览": "templates/mall-guide/layout.js"
};
