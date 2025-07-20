document.addEventListener('DOMContentLoaded', () => {

    /**
     * @description 渲染引擎 (Render Engine)
     * 这是一个核心模块，包含了一系列通用的、无状态的渲染函数。
     * 每个函数接收 JSON 数据 (data) 和一个声明式的映射对象 (mapping)，然后返回一个 HTML 字符串。
     * 这种设计将“渲染逻辑”与“HTML结构定义”完全解耦。
     */
    const renderEngine = {
        /**
         * 渲染一个最基础的、由 mapping 定义的 HTML 元素。
         * @param {string | null} data - 要填充的内容，如果没有则只渲染静态文本。
         * @param {object} mapping - 定义 HTML 结构的配置对象, e.g., { tag: 'div', className: 'title', staticText: '你好' }。
         * @returns {string}
         */
        element: (data, mapping) => {
            if (!data && !mapping.staticText) return ''; // 如果没有数据也没有静态文本，则不渲染
            const { tag, className, children, staticText } = mapping;
            const content = staticText || data; // 优先使用静态文本
            // 递归渲染子元素（如果定义了）
            const childHtml = children ? children.map(child => renderEngine.element(data, child)).join('') : '';
            return `<${tag} class="${className || ''}">${content}${childHtml}</${tag}>`;
        },

        /**
         * 专门用于渲染“总览”区域 (overview block)。
         * @param {object} data - overview 对应的 JSON 对象。
         * @param {object} mapping - overview 块的映射配置。
         * @returns {string}
         */
        overview: (data, mapping) => {
            // 渲染静态标题，例如“行程总览”
            const titleHtml = renderEngine.element(null, mapping.title);
            // 遍历 mapping 中定义的字段，并从 data 中取值进行渲染
            const fieldsHtml = mapping.fields.map(field => {
                const value = data[field.jsonKey];
                if (!value) return '';
                const iconHtml = renderEngine.element(null, field.icon);
                const labelHtml = renderEngine.element(null, field.label);
                const valueHtml = renderEngine.element(value, field.value);
                return `<div class="${field.className}">${iconHtml}${labelHtml}${valueHtml}</div>`;
            }).join('');
            return `${titleHtml}${fieldsHtml}`;
        },

        /**
         * 专门用于渲染整个“天数”区域 (days block)，这是最复杂的部分。
         * @param {Array} data - days 对应的 JSON 数组。
         * @param {object} mapping - days 块的映射配置。
         * @returns {string}
         */
        days: (data, mapping) => {
            // 1. 渲染“线路概览”标题
            const overviewHtml = renderEngine.element(null, mapping.overview);
            // 2. 渲染每天的快速链接
            const dayLinksHtml = data.map(day => `<div class="trip-plan-day"><span class="day-num">${day.dayNum}</span><span class="day-detail">${day.dayTitle}</span></div>`).join('');
            // 3. 渲染分割线
            const separatorHtml = `<div class="plan-fgx"></div>`;

            // 4. 详细渲染每一天的内容
            const dayDetailsHtml = data.map(day => {
                // 渲染每日的头部信息
                const dayNumParts = (day.dayNum || '').split(' ');
                const headerHtml = `
                    <div class="day-item-header">
                        <div class="day-item-num">
                            <div class="day-title">${dayNumParts[0]}</div>
                            <div class="day-sort">${dayNumParts[1] || ''}</div>
                        </div>
                        <div class="day-item-info">${day.dayTitle}</div>
                    </div>`;

                // 渲染每日的行程项 (items)
                const itemsHtml = day.items.map(item => {
                    const itemNameHtml = `<div class="day-item-name"><div class="item-circle"><span class="big-circle"><span class="small-circle"></span></span></div><div class="item-name">${item.product.productName || item.intro}</div></div>`;
                    const itemContentHtml = `
                        <div class="day-item-content">
                            <div class="day-item-time">${item.time}</div>
                            <div class="day-item-intro">${item.intro}</div>
                            ${renderEngine.product(item.product, mapping.itemProduct)}
                        </div>`;
                    return `<div class="day-item-main">${itemNameHtml}${itemContentHtml}</div>`;
                }).join('');

                return `${headerHtml}${itemsHtml}`;
            }).join('');

            return `${overviewHtml}${dayLinksHtml}${separatorHtml}${dayDetailsHtml}`;
        },

        /**
         * 专门用于渲染“产品”区域 (product block)。
         * @param {object} data - product 对应的 JSON 对象。
         * @param {object} mapping - 产品块的映射配置。
         * @returns {string}
         */
        product: (data, mapping) => {
            // 如果没有产品信息，或者只是占位的“酒店推荐”，则不渲染
            if (!data || !data.productName || data.productName === '酒店推荐') return '';
            const imgHtml = `<img src="${data.linkMobileImg}" class="${mapping.img.className}">`;
            const nameHtml = `<div class="${mapping.name.className}"><span class="pro-name">${data.productName}</span></div>`;
            
            // 渲染子产品列表 (productDetailList)，确保数据不丢失
            const subProductsHtml = (data.productDetailList || []).map(sub => {
                return `<div class="${mapping.subProduct.className}">${sub.productName} - ¥${sub.price}</div>`;
            }).join('');
            const subProductContainerHtml = subProductsHtml ? `<div class="${mapping.subProductContainer.className}">${subProductsHtml}</div>` : '';

            const infoHtml = `<div class="${mapping.info.className}">${nameHtml}${subProductContainerHtml}</div>`;
            return `<div class="${mapping.container.className}">${imgHtml}${infoHtml}</div>`;
        },
        
        /**
         * 用于渲染带有标题的简单文本块，例如“注意事项”和“美食地图”。
         * @param {string} data - 文本内容。
         * @param {object} mapping - 映射配置。
         * @returns {string}
         */
        titledBlock: (data, mapping) => {
            const titleHtml = renderEngine.element(null, mapping.title);
            const contentHtml = renderEngine.element(data.replace(/\n/g, '<br>'), mapping.content);
            return `${titleHtml}${contentHtml}`;
        }
    };

    /**
     * @description 模板定义 (Template Definition)
     * 这是避免硬编码的核心。它用一个纯粹的 JavaScript 对象来“声明”一个完整的页面布局。
     * `blocks` 数组定义了渲染的顺序和规则。
     * 每个 block 内部的 `mapping` 对象是渲染的“蓝图”，它告诉 `renderEngine` 如何生成 HTML。
     */
    const tripPlanLayoutV3 = {
        name: "行程规划",
        blocks: [
            // 每个块都由三部分组成: id (标识), matcher (匹配规则), renderer (使用的渲染函数), mapping (渲染蓝图)
            { id: "routeTitle", matcher: key => key === 'routeTitle', renderer: renderEngine.element, mapping: { tag: 'div', className: 'route-plan-title' } },
            { id: "overview", matcher: key => key === 'overview', renderer: renderEngine.overview, mapping: { title: { tag: 'div', className: 'trip-plan-overview', staticText: '行程总览' }, fields: [ { jsonKey: 'days', className: 'overview-item', icon: { tag: 'i', className: 'iconfont iconxj-tianshu overview-item-icon' }, label: { tag: 'span', className: 'overview-item-label', staticText: '天数：' }, value: { tag: 'span', className: 'overview-item-text' } }, { jsonKey: 'play', className: 'overview-item', icon: { tag: 'i', className: 'iconfont iconxj-youwan overview-item-icon' }, label: { tag: 'span', className: 'overview-item-label', staticText: '游玩：' }, value: { tag: 'span', className: 'overview-item-text' } }, { jsonKey: 'budget', className: 'overview-item', icon: { tag: 'i', className: 'iconfont iconxj-yusuan overview-item-icon' }, label: { tag: 'span', className: 'overview-item-label', staticText: '预算：' }, value: { tag: 'span', className: 'overview-item-text' } } ] } },
            { id: "days", matcher: key => key === 'days', renderer: renderEngine.days, mapping: { overview: { tag: 'div', className: 'trip-plan-overview route-plan-overview', staticText: '线路概览' }, itemProduct: { container: { className: 'plan-pro' }, img: { className: 'plan-pro-img' }, info: { className: 'plan-pro-info' }, name: { className: 'plan-pro-name' }, subProductContainer: { className: 'sub-product-list'}, subProduct: { className: 'sub-product-item' } } } },
            { id: "tips", matcher: key => key === 'tips', renderer: renderEngine.titledBlock, mapping: { title: { tag: 'div', className: 'trip-plan-overview route-plan-overview', staticText: '&#x2757; 注意事项' }, content: { tag: 'div', className: 'plan-other-info' } } },
            { id: "foodMap", matcher: key => key === 'foodMap', renderer: renderEngine.titledBlock, mapping: { title: { tag: 'div', className: 'trip-plan-overview route-plan-overview', staticText: '&#x1F372; 美食地图' }, content: { tag: 'div', className: 'plan-other-info' } } }
        ]
    };

    // 模板注册表，用于存储和查找所有可用的布局模板
    const templateRegistry = { layouts: [tripPlanLayoutV3], findLayoutFor: function(type) { return this.layouts.find(l => l.name === type); } };

    /**
     * @description JSON 补全器 (JSON Completer)
     * 它的职责是接收一个可能残缺的 JSON 字符串，并尝试将其修复成一个语法有效的 JSON。
     * 它使用一个简单的基于堆栈的算法来匹配和闭合未关闭的 `{` 和 `[`。
     */
    function completeJson(str) {
        const stack = [];
        for (let i = 0; i < str.length; i++) {
            const char = str[i];
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

    /**
     * @description 流处理器 (Stream Processor)
     * 这是整个工作流的“总指挥”。它接收输入，调用其他模块，并管理整个转换过程的状态。
     */
    class StreamProcessor {
        constructor(registry) { this.registry = registry; this.reset(); }
        reset() { this.state = { currentLayout: null, currentBlock: null, nextExpectedBlock: null, processedKeys: new Set(), htmlOutput: '', completedJson: '' }; }
        process(jsonChunk) {
            this.reset();
            
            // 步骤 1: 调用 JSON 补全器修复输入数据
            this.state.completedJson = completeJson(jsonChunk);
            document.getElementById('completed-json-source').textContent = this.state.completedJson;

            // 步骤 2: 尝试解析修复后的 JSON
            let data;
            try {
                data = JSON.parse(this.state.completedJson);
            } catch (e) {
                console.error("解析JSON失败:", e);
                this.state.currentLayout = { name: 'JSON解析失败' };
                return;
            }

            // 步骤 3: 根据 JSON 的 `type` 字段查找对应的布局模板
            const layout = this.registry.findLayoutFor(data.type);
            if (!layout) {
                this.state.currentLayout = { name: '未找到匹配的布局' };
                return;
            }
            this.state.currentLayout = layout;

            // 步骤 4: 按照模板中 `blocks` 定义的顺序，遍历并渲染每一个块
            const dataKeys = Object.keys(data);
            layout.blocks.forEach(block => {
                const matchedKey = dataKeys.find(key => block.matcher(key));
                if (matchedKey && !this.state.processedKeys.has(matchedKey)) {
                    // 调用块指定的渲染器，并传入数据和该块的映射配置
                    const htmlFragment = block.renderer(data[matchedKey], block.mapping);
                    this.state.htmlOutput += htmlFragment;
                    this.state.processedKeys.add(matchedKey);
                    this.state.currentBlock = block;
                }
            });

            // 步骤 5: 更新状态，预测下一个可能的节点
            if (this.state.currentBlock && this.state.currentBlock.nextPossibleBlocks && this.state.currentBlock.nextPossibleBlocks.length > 0) {
                const nextBlockId = this.state.currentBlock.nextPossibleBlocks[0];
                this.state.nextExpectedBlock = layout.blocks.find(b => b.id === nextBlockId);
            }
        }
        getHtml() { return this.state.htmlOutput; }
        getState() { return { layout: this.state.currentLayout ? this.state.currentLayout.name : '-', node: this.state.currentBlock ? this.state.currentBlock.id : '-', nextNode: this.state.nextExpectedBlock ? this.state.nextExpectedBlock.id : '-' }; }
    }

    // --- DOM 操作 (DOM Manipulation) ---
    // 这部分负责将所有模块连接到 HTML 页面上，响应用户操作。
    const jsonInput = document.getElementById('json-input');
    const convertBtn = document.getElementById('convert-btn');
    const htmlPreview = document.getElementById('html-preview');
    const htmlSource = document.getElementById('html-source');
    const completedJsonSource = document.getElementById('completed-json-source');
    const currentLayoutEl = document.getElementById('current-layout');
    const currentNodeEl = document.getElementById('current-node');
    const nextNodeEl = document.getElementById('next-node');
    const processor = new StreamProcessor(templateRegistry);
    convertBtn.addEventListener('click', () => {
        const jsonText = jsonInput.value;
        processor.process(jsonText);
        const html = processor.getHtml();
        const state = processor.getState();
        htmlPreview.innerHTML = html;
        htmlSource.textContent = html;
        currentLayoutEl.textContent = state.layout;
        currentNodeEl.textContent = state.node;
        nextNodeEl.textContent = state.nextNode;
    });
});