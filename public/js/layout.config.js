/**
 * @file layout.config.js
 * @description 布局配置文件。
 * 定义了 JSON `type` 到其对应布局模块文件路径的映射。
 * 
 * 重要提示：这里的路径是相对于项目根目录的 URL 路径，
 * 因为它们将被用于动态 import()，必须是浏览器可访问的绝对路径。
 */
export const LAYOUT_CONFIG = {
  "行程规划": "/templates/trip-plan/layout.js",
  "园区内规划": "/templates/park-plan/layout.js"
  // 未来要支持新的类型，只需在这里添加一行映射即可。
  // 例如: "new-type": "/templates/new-type/layout.js"
};
