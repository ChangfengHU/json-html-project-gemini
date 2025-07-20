/**
 * @description 行程规划 (Trip Plan) 模板模块
 * 这是一个完全自给自足的模块。
 * 它定义了自身的渲染逻辑和布局配置。
 */

// 模块内部的渲染函数
const tripPlanRenderers = {
    overview: (data, mapping) => {
        const titleHtml = window.renderEngine.element(null, mapping.title);
        const fieldsHtml = mapping.fields.map(field => {
            const value = data[field.jsonKey];
            if (!value) return '';
            const iconHtml = field.icon ? window.renderEngine.element(null, field.icon) : '';
            const labelHtml = window.renderEngine.element(null, field.label);
            const valueHtml = window.renderEngine.element(value, field.value);
            return `<div class="${field.className}">${iconHtml}${labelHtml}${valueHtml}</div>`;
        }).join('');
        return `${titleHtml}${fieldsHtml}`;
    },
    days: (data, mapping) => {
        const overviewHtml = window.renderEngine.element(null, mapping.overview);
        const dayLinksHtml = data.map(day => `<div class="trip-plan-day"><span class="day-num">${day.dayNum}</span><span class="day-detail">${day.dayTitle}</span></div>`).join('');
        const separatorHtml = `<div class="plan-fgx"></div>`;
        const dayDetailsHtml = data.map(day => {
            const dayNumParts = (day.dayNum || '').split(' ');
            const headerHtml = `
                <div class="day-item-header">
                    <div class="day-item-num"><div class="day-title">${dayNumParts[0]}</div><div class="day-sort">${dayNumParts[1] || ''}</div></div>
                    <div class="day-item-info">${day.dayTitle}</div>
                </div>`;
            const itemsHtml = day.items.map(item => {
                // Defensive check: Ensure product exists before trying to access its properties.
                const productName = (item.product && item.product.productName) || item.intro || '';
                const productHtml = item.product ? tripPlanRenderers.product(item.product, mapping.itemProduct) : '';

                const itemNameHtml = `<div class="day-item-name"><div class="item-circle"><span class="big-circle"><span class="small-circle"></span></span></div><div class="item-name">${productName}</div></div>`;
                const itemContentHtml = `
                    <div class="day-item-content">
                        <div class="day-item-time">${item.time || ''}</div>
                        <div class="day-item-intro">${item.intro || ''}</div>
                        ${productHtml}
                    </div>`;
                return `<div class="day-item-main">${itemNameHtml}${itemContentHtml}</div>`;
            }).join('');
            return `${headerHtml}${itemsHtml}`;
        }).join('');
        return `${overviewHtml}${dayLinksHtml}${separatorHtml}${dayDetailsHtml}`;
    },
    product: (data, mapping) => {
        if (!data || !data.productName || data.productName === '酒店推荐') return '';
        const imgHtml = `<img src="${data.linkMobileImg}" class="${mapping.img.className}">`;
        const nameHtml = `<div class="${mapping.name.className}"><span class="pro-name">${data.productName}</span></div>`;
        const subProductsHtml = (data.productDetailList || []).map(sub => `<div class="${mapping.subProduct.className}">${sub.productName} - ¥${sub.price}</div>`).join('');
        const subProductContainerHtml = subProductsHtml ? `<div class="${mapping.subProductContainer.className}">${subProductsHtml}</div>` : '';
        const infoHtml = `<div class="${mapping.info.className}">${nameHtml}${subProductContainerHtml}</div>`;
        return `<div class="${mapping.container.className}">${imgHtml}${infoHtml}</div>`;
    },
    titledBlock: (data, mapping) => {
        const titleHtml = window.renderEngine.element(null, mapping.title);
        const contentHtml = window.renderEngine.element(data.replace(/\n/g, '<br>'), mapping.content);
        return `${titleHtml}${contentHtml}`;
    }
};

// 模块的布局定义
const tripPlanLayout = {
    name: "行程规划",
    blocks: [
        { id: "routeTitle", matcher: key => key === 'routeTitle', renderer: window.renderEngine.element, mapping: { tag: 'div', className: 'route-plan-title' }, next: ['overview'] },
        { id: "overview", matcher: key => key === 'overview', renderer: tripPlanRenderers.overview, mapping: { title: { tag: 'div', className: 'trip-plan-overview', staticText: '行程总览' }, fields: [ { jsonKey: 'days', className: 'overview-item', icon: { tag: 'i', className: 'iconfont iconxj-tianshu overview-item-icon' }, label: { tag: 'span', className: 'overview-item-label', staticText: '天数：' }, value: { tag: 'span', className: 'overview-item-text' } }, { jsonKey: 'play', className: 'overview-item', icon: { tag: 'i', className: 'iconfont iconxj-youwan overview-item-icon' }, label: { tag: 'span', className: 'overview-item-label', staticText: '游玩：' }, value: { tag: 'span', className: 'overview-item-text' } }, { jsonKey: 'budget', className: 'overview-item', icon: { tag: 'i', className: 'iconfont iconxj-yusuan overview-item-icon' }, label: { tag: 'span', className: 'overview-item-label', staticText: '预算：' }, value: { tag: 'span', className: 'overview-item-text' } } ] }, next: ['days'] },
        { id: "days", matcher: key => key === 'days', renderer: tripPlanRenderers.days, mapping: { overview: { tag: 'div', className: 'trip-plan-overview route-plan-overview', staticText: '线路概览' }, itemProduct: { container: { className: 'plan-pro' }, img: { className: 'plan-pro-img' }, info: { className: 'plan-pro-info' }, name: { className: 'plan-pro-name' }, subProductContainer: { className: 'sub-product-list'}, subProduct: { className: 'sub-product-item' } } }, next: ['tips'],
          // 精心设计的静态图谱，反映了模板的完整潜力
          graph: [
            { name: '线路概览标题' },
            { name: '每日概要链接 (循环)' },
            { name: '每日详情 (循环)', children: [
                { name: '头部 (日期/标题)' },
                { name: '行程项 (循环)', children: [
                    { name: '时间与介绍' },
                    { name: '关联产品', children: [
                        { name: '产品主图与名称'},
                        { name: '子产品列表 (循环)' }
                    ] }
                ] }
            ] }
          ]
        },
        { id: "tips", matcher: key => key === 'tips', renderer: tripPlanRenderers.titledBlock, mapping: { title: { tag: 'div', className: 'trip-plan-overview route-plan-overview', staticText: '&#x2757; 注意事项' }, content: { tag: 'div', className: 'plan-other-info' } }, next: ['foodMap'] },
        { id: "foodMap", matcher: key => key === 'foodMap', renderer: tripPlanRenderers.titledBlock, mapping: { title: { tag: 'div', className: 'trip-plan-overview route-plan-overview', staticText: '&#x1F372; 美食地图' }, content: { tag: 'div', className: 'plan-other-info' } }, next: [] }
    ]
};

// 自我注册到全局注册表
if (window.templateRegistry) {
    window.templateRegistry.register(tripPlanLayout);
}