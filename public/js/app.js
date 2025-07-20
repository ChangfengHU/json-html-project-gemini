/**
 * @file app.js
 * @description 核心渲染引擎与应用逻辑 (v8.1 - 语法修复最终版)
 */
document.addEventListener('DOMContentLoaded', () => {

    // 1. 基础渲染引擎 (暴露在 window 上，供布局模块使用)
    window.renderEngine = {
        element: (data, mapping) => {
            if (!data && !mapping.staticText) return '';
            const { tag, className, children, staticText } = mapping;
            const content = staticText || data;
            const childHtml = children ? children.map(child => window.renderEngine.element(data, child)).join('') : '';
            return `<${tag} class="${className || ''}">${content}${childHtml}</${tag}>`;
        }
    };

    // 2. 全局模板注册表 (暴露在 window 上，供布局模块使用)
    window.templateRegistry = {
        layouts: [],
        register: function(layout) { if (!this.layouts.some(l => l.name === layout.name)) { this.layouts.push(layout); } },
        findLayoutFor: function(type) { return this.layouts.find(l => l.name === type); }
    };

    // 3. 动态布局加载器
    const layoutLoader = {
        loaded: new Set(),
        load: function(type) {
            return new Promise((resolve, reject) => {
                const path = LAYOUT_CONFIG[type];
                if (!path) return reject(new Error(`No layout path for type: ${type}`));
                if (this.loaded.has(path)) return resolve();
                const script = document.createElement('script');
                script.src = path;
                script.onload = () => { this.loaded.add(path); resolve(); };
                script.onerror = () => reject(new Error(`Failed to load script: ${path}`));
                document.head.appendChild(script);
            });
        }
    };

    // 4. JSON 补全器
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

    // 5. 静态多层级布局图生成器
    function generateLayoutGraph(layout, currentNodeId, nextNodeIds) {
        if (!layout) return "";
        function buildTree(nodes, prefix) {
            let treeString = "";
            nodes.forEach((node, index) => {
                const isLast = index === nodes.length - 1;
                const newPrefix = prefix + (isLast ? "    " : "│   ");
                const connector = isLast ? "└── " : "├── ";
                treeString += prefix + connector + node.name + "\n";
                if (node.children) {
                    treeString += buildTree(node.children, newPrefix);
                }
            });
            return treeString;
        }
        let graph = `[布局: ${layout.name}]\n`;
        layout.blocks.forEach((block, index) => {
            const isLast = index === layout.blocks.length - 1;
            const prefix = isLast ? "└── " : "├── ";
            const childPrefix = isLast ? "    " : "│   ";
            let line = prefix + block.id;
            if (block.id === currentNodeId) line += " <== 当前";
            if (nextNodeIds.includes(block.id)) line += " <== 预备";
            graph += line + "\n";
            if (block.graph) {
                graph += buildTree(block.graph, childPrefix);
            }
        });
        return graph;
    }

    // 6. 增量更新的流处理器
    class StreamProcessor {
        constructor(registry, loader) {
            this.registry = registry;
            this.loader = loader;
            this.reset();
        }
        reset() {
            this.state = { currentLayout: null, lastProcessedBlock: null, nextPossibleNodes: [], completedJson: '' };
            document.getElementById('html-preview').innerHTML = '';
            document.getElementById('html-source').textContent = '';
        }
        async process(jsonChunk) {
            this.state.completedJson = completeJson(jsonChunk);
            let data;
            try {
                data = JSON.parse(this.state.completedJson);
            } catch (e) {
                this.state.currentLayout = { name: 'JSON解析失败' };
                this.updateStatusUI();
                return;
            }

            if (!this.state.currentLayout || this.state.currentLayout.name !== data.type) {
                 try {
                    await this.loader.load(data.type);
                } catch (error) {
                    this.state.currentLayout = { name: `布局加载失败: ${data.type}` };
                    this.updateStatusUI();
                    return;
                }
                const layout = this.registry.findLayoutFor(data.type);
                if (!layout) {
                    this.state.currentLayout = { name: '未找到匹配的布局' };
                    this.updateStatusUI();
                    return;
                }
                this.state.currentLayout = layout;
            }

            const layout = this.state.currentLayout;
            const dataKeys = Object.keys(data);
            let fullHtmlSource = '';

            layout.blocks.forEach(block => {
                const matchedKey = dataKeys.find(key => block.matcher(key));
                if (matchedKey) {
                    let blockHtml = '';
                    try {
                        blockHtml = block.renderer(data[matchedKey], block.mapping);
                    } catch (error) {
                        // 渲染出错时返回空字符串，避免在UI上显示错误提示
                        blockHtml = ''; 
                        console.error(`渲染块 '${block.id}' 时出错:`, error); // 在控制台记录错误，方便调试
                    }
                    
                    const wrapperId = `wrapper-${block.id}`;
                    let wrapper = document.getElementById(wrapperId);
                    if (!wrapper) {
                        wrapper = document.createElement('div');
                        wrapper.id = wrapperId;
                        document.getElementById('html-preview').appendChild(wrapper);
                    }
                    wrapper.innerHTML = blockHtml;
                    fullHtmlSource += blockHtml;
                    this.state.lastProcessedBlock = block;
                }
            });

            this.state.nextPossibleNodes = [];
            if (this.state.lastProcessedBlock) {
                const lastBlock = this.state.lastProcessedBlock;
                const isArrayBlock = Array.isArray(data[lastBlock.id]);
                const isPartialArray = jsonChunk.trim().endsWith(',');
                if (isArrayBlock && isPartialArray) {
                    this.state.nextPossibleNodes.push(lastBlock.id);
                }
                if (lastBlock.next) {
                    this.state.nextPossibleNodes.push(...lastBlock.next);
                }
            }

            this.updateStatusUI(fullHtmlSource, data);
        }

        updateStatusUI(htmlSource, data) {
            const { currentLayout, lastProcessedBlock, nextPossibleNodes } = this.state;
            if(htmlSource !== undefined) document.getElementById('html-source').textContent = htmlSource;
            document.getElementById('completed-json-source').textContent = this.state.completedJson;
            document.getElementById('current-layout').textContent = currentLayout ? currentLayout.name : '-';
            document.getElementById('current-node').textContent = lastProcessedBlock ? lastProcessedBlock.id : '-';
            document.getElementById('next-node').textContent = nextPossibleNodes.length > 0 ? nextPossibleNodes.join(', ') : '-';
            document.getElementById('layout-graph').textContent = generateLayoutGraph(currentLayout, lastProcessedBlock ? lastProcessedBlock.id : null, nextPossibleNodes);
        }
    }

    // 7. DOM 操作
    const convertBtn = document.getElementById('convert-btn');
    const streamBtn = document.getElementById('stream-btn');
    // Expose the processor to the window object so streamer.js can call it directly
    window.processor = new StreamProcessor(window.templateRegistry, layoutLoader);

    convertBtn.addEventListener('click', async () => {
        window.processor.reset(); // Manual conversion should always reset
        await window.processor.process(jsonInput.value);
    });

    // Expose a specific function for streamer to start a new session
    window.startStreaming = () => window.processor.reset();
});