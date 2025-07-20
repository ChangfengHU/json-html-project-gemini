/**
 * @description 园区内规划 (Park Plan) 模板模块
 * 这是一个完全自给自足的模块。
 */

// 模块内部的渲染函数
const parkPlanRenderers = {
    overview: (data, mapping) => {
        const titleHtml = window.renderEngine.element(null, mapping.title);
        const fieldsHtml = mapping.fields.map(field => {
            const value = data[field.jsonKey];
            if (!value) return '';
            const labelHtml = window.renderEngine.element(null, field.label);
            const valueHtml = window.renderEngine.element(value, field.value);
            return `<div class="${field.className}">${labelHtml}${valueHtml}</div>`;
        }).join('');
        return `${titleHtml}${fieldsHtml}`;
    },
    stops: (data, mapping) => {
        return data.map(stop => {
            const headerHtml = `<div class="stop-header"><span class="stop-num">${stop.stopNum}</span><h3 class="stop-name">${stop.stopName}</h3></div>`;
            const descHtml = `<p class="stop-description">${stop.description}</p>`;
            const timeHtml = `<div class="stop-time">预计用时: ${stop.estimated_time}</div>`;
            return `<div class="park-stop-item">${headerHtml}${descHtml}${timeHtml}</div>`;
        }).join('');
    },
    titledBlock: (data, mapping) => {
        const titleHtml = window.renderEngine.element(null, mapping.title);
        const contentHtml = window.renderEngine.element(data.replace(/\n/g, '<br>'), mapping.content);
        return `${titleHtml}${contentHtml}`;
    }
};

// 模块的布局定义
const parkPlanLayout = {
    name: "园区内规划",
    blocks: [
        { id: "routeTitle", matcher: key => key === 'routeTitle', renderer: window.renderEngine.element, mapping: { tag: 'div', className: 'park-route-title' }, next: ['overview'] },
        { id: "overview", matcher: key => key === 'overview', renderer: parkPlanRenderers.overview, mapping: { title: { tag: 'div', className: 'park-overview-container' }, fields: [ { jsonKey: 'duration', className: 'park-overview-item', label: { tag: 'strong', staticText: '游览时长: ' }, value: { tag: 'span' } }, { jsonKey: 'theme', className: 'park-overview-item', label: { tag: 'strong', staticText: '主题: ' }, value: { tag: 'span' } }, { jsonKey: 'suggested_for', className: 'park-overview-item', label: { tag: 'strong', staticText: '适合人群: ' }, value: { tag: 'span' } } ] }, next: ['stops'] },
        { id: "stops", matcher: key => key === 'stops', renderer: parkPlanRenderers.stops, mapping: {}, next: ['tips'],
          graph: [
            { name: '站点 (循环)', children: [
                { name: '站点头部 (序号/名称)' },
                { name: '描述' },
                { name: '预计用时' }
            ] }
          ]
        },
        { id: "tips", matcher: key => key === 'tips', renderer: parkPlanRenderers.titledBlock, mapping: { title: { tag: 'h4', staticText: '游览提示' }, content: { tag: 'div', className: 'park-tips' } }, next: [] }
    ]
};

// 自我注册到全局注册表
if (window.templateRegistry) {
    window.templateRegistry.register(parkPlanLayout);
}