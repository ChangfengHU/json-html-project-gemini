/**
 * @file JsonHtmlConverter.js
 * @description 一个独立的、可重用的工具类，用于将 JSON 字符串根据布局配置转换为 HTML。
 *
 * 这个模块不依赖任何外部库或 DOM 环境，使其可以在任何 JavaScript 环境中使用，例如 Node.js 或其他前端框架（Vue, React等）。
 *
 * @version 1.0
 */
export class JsonHtmlConverter {

    /**
     * 将 JSON 字符串和布局对象转换为 HTML 字符串。
     * @param {string} jsonString - 完整的 JSON 格式的字符串。
     * @param {object} layout - 描述如何渲染 JSON 的布局对象。它应该包含 `name` 和 `blocks` 属性。
     * @returns {string} 生成的 HTML 字符串。
     * @throws {Error} 如果 JSON 解析失败或布局无效。
     */
    convert(jsonString, layout) {
        if (!jsonString || !layout || !layout.blocks || !Array.isArray(layout.blocks)) {
            throw new Error("A valid JSON string and layout object are required.");
        }

        const completedJsonStr = this._completeJson(jsonString);
        let data;

        try {
            data = JSON.parse(completedJsonStr);
        } catch (e) {
            throw new Error(`Failed to parse JSON string: ${e.message}`);
        }

        // 警告：如果JSON的类型与布局名称不匹配，可能会导致渲染问题
        if (data.type !== layout.name) {
            console.warn(`JSON type "${data.type}" does not match layout name "${layout.name}". This may lead to rendering issues.`);
        }

        const dataKeys = Object.keys(data);
        let fullHtmlSource = '';

        // 遍历布局块并渲染
        layout.blocks.forEach(block => {
            const matchedKey = dataKeys.find(key => this._matches(block.matcher, key));
            if (matchedKey) {
                try {
                    const blockData = data[matchedKey];
                    const blockMapping = block.mapping;
                    // 根据数据是数组还是对象来调用渲染器
                    const blockHtml = Array.isArray(blockData)
                        ? blockData.map(item => this._renderElement(item, blockMapping[0])).join('')
                        : this._renderElement(blockData, blockMapping);
                    fullHtmlSource += blockHtml;
                } catch (error) {
                    console.error(`Error rendering block '${block.id}':`, error);
                    fullHtmlSource += `<!-- Render Error in block: ${block.id} -->`;
                }
            }
        });

        return fullHtmlSource;
    }

    // --- 私有辅助方法 ---

    /**
     * 基础的 HTML 元素渲染函数（递归）。
     * @param {object} data - 当前要渲染的数据片段（通常是一个对象）。
     * @param {object} mapping - 该元素的映射配置。
     * @returns {string} 生成的 HTML 字符串。
     */
    _renderElement(data, mapping) {
        if (!mapping) return '';

        const { tag, className, dataKey, children, staticText, hrefKey, srcKey } = mapping;

        // 优先处理静态文本
        if (staticText) {
            return staticText;
        }

        if (!tag) return '';

        const content = dataKey && data[dataKey] ? data[dataKey] : '';
        
        let attributes = '';
        if (className) attributes += ` class="${className}"`;
        if (hrefKey && data[hrefKey]) attributes += ` href="${data[hrefKey]}"`;
        if (srcKey && data[srcKey]) attributes += ` src="${data[srcKey]}"`;

        const childrenHtml = children && Array.isArray(children)
            ? children.map(childMapping => this._renderElement(data, childMapping)).join('')
            : '';

        return `<${tag}${attributes}>${content}${childrenHtml}</${tag}>`;
    }

    /**
     * 检查一个键是否与匹配器匹配。
     * @param {Function|string} matcher - 匹配器（函数或字符串）。
     * @param {string} key - 要检查的键。
     * @returns {boolean}
     */
    _matches(matcher, key) {
        if (typeof matcher === 'function') {
            return matcher(key);
        }
        return matcher === key;
    }

    /**
     * 补全可能不完整的 JSON 字符串，使其可以被安全地解析。
     * @param {string} str - 输入的 JSON 字符串。
     * @returns {string} 补全后的 JSON 字符串。
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

            if (char === '{' || char === '[') {
                stack.push(char);
            } else if (char === '}' && stack.length > 0 && stack[stack.length - 1] === '{') {
                stack.pop();
            } else if (char === ']' && stack.length > 0 && stack[stack.length - 1] === '[') {
                stack.pop();
            }
        }

        let closingChars = '';
        while (stack.length > 0) {
            const openChar = stack.pop();
            if (openChar === '{') closingChars += '}';
            if (openChar === '[') closingChars += ']';
        }

        let cleanedStr = str.trim();
        if (cleanedStr.endsWith(',')) {
            cleanedStr = cleanedStr.slice(0, -1);
        }

        return cleanedStr + closingChars;
    }
}

