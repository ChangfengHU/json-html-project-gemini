/**
 * @file JsonHtmlFactory.js
 * @description 一个易于使用的工厂，可根据 JSON `type` 自动加载布局并渲染 HTML。
 * 这是在第三方项目中推荐使用的主要入口点。
 */

import { LAYOUT_CONFIG } from './layout.config.js';
import { JsonHtmlConverter } from './JsonHtmlConverter.js';

class JsonHtmlFactory {
    constructor() {
        this.converter = new JsonHtmlConverter();
        this.loadedLayouts = new Map(); // 缓存已加载的布局模块
    }

    /**
     * 核心方法：接收 JSON 字符串，自动识别类型，加载布局，并返回渲染后的 HTML。
     * @param {string} jsonString - 包含 `type` 字段的 JSON 字符串。
     * @returns {Promise<string>} - 返回一个 Promise，解析为渲染后的 HTML 字符串。
     * @throws {Error} 如果 JSON 解析失败、类型未定义、或布局加载失败。
     */
    async create(jsonString) {
        let data;
        try {
            // 这里我们只解析一次，以获取 type
            data = JSON.parse(this._completeJson(jsonString));
        } catch (e) {
            throw new Error(`Invalid JSON string provided: ${e.message}`);
        }

        const type = data.type;
        if (!type) {
            throw new Error('The provided JSON must have a `type` property.');
        }

        const layoutPath = LAYOUT_CONFIG[type];
        if (!layoutPath) {
            throw new Error(`No layout configured for type: "${type}". Please check layout.config.js.`);
        }

        let layoutModule;
        if (this.loadedLayouts.has(layoutPath)) {
            // 从缓存加载
            layoutModule = this.loadedLayouts.get(layoutPath);
        } else {
            // 动态导入布局模块
            try {
                layoutModule = await import(layoutPath);
                this.loadedLayouts.set(layoutPath, layoutModule); // 缓存结果
            } catch (error) {
                console.error(`Failed to dynamically import layout from: ${layoutPath}`, error);
                throw new Error(`Could not load layout for type "${type}".`);
            }
        }

        const layoutObject = layoutModule.layout; // 假设每个布局文件都导出一个名为 'layout' 的对象
        if (!layoutObject) {
            throw new Error(`The layout file at ${layoutPath} did not export a 'layout' object.`);
        }

        // 使用转换器生成 HTML
        return this.converter.convert(jsonString, layoutObject);
    }

    /**
     * 私有方法：补全 JSON 字符串，确保可以解析。
     * @param {string} str - 输入的 JSON 字符串。
     * @returns {string} - 补全后的 JSON 字符串。
     */
    _completeJson(str) {
        const stack = [];
        let inString = false;
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '"' && (i === 0 || str[i - 1] !== '\\')) {
                inString = !inString;
            }
            if (inString) continue;
            if (char === '{' || char === '[') stack.push(char);
            else if (char === '}' && stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
            else if (char === ']' && stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
        }
        let closingChars = '';
        while (stack.length > 0) {
            const openChar = stack.pop();
            if (openChar === '{') closingChars += '}';
            if (openChar === '[') closingChars += ']';
        }
        let cleanedStr = str.trim();
        if (cleanedStr.endsWith(',')) cleanedStr = cleanedStr.slice(0, -1);
        return cleanedStr + closingChars;
    }
}

// 导出一个单例，方便直接使用
export const jsonHtmlFactory = new JsonHtmlFactory();