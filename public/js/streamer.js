/**
 * @file streamer.js
 * @description 负责模拟 JSON 流式输入的“播放器”。
 */
document.addEventListener('DOMContentLoaded', () => {
    const exampleSelect = document.getElementById('example-select');
    const speedSlider = document.getElementById('speed-slider');
    const speedValue = document.getElementById('speed-value');
    const jsonInput = document.getElementById('json-input');
    const streamBtn = document.getElementById('stream-btn');
    const convertBtn = document.getElementById('convert-btn');

    let intervalId = null;

    // 更新速度滑块的显示值
    speedSlider.addEventListener('input', () => {
        speedValue.textContent = `${speedSlider.value}ms`;
    });

    // 点击“流式输入”按钮的逻辑
    streamBtn.addEventListener('click', async () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            streamBtn.textContent = "流式输入";
            return;
        }

        const selectedExample = exampleSelect.value;
        const examplePath = `templates/${selectedExample}/example.json`;

        try {
            const response = await fetch(examplePath);
            const fullJson = await response.text();
            
            // 调用 app.js 中暴露的 reset 方法
            if(window.startStreaming) {
                window.startStreaming();
            }

            jsonInput.value = ''; // 清空输入框
            streamBtn.textContent = "停止";
            let currentIndex = 0;

            const speed = parseInt(speedSlider.value, 10);

            intervalId = setInterval(() => {
                if (currentIndex < fullJson.length) {
                    // 每次追加一小段字符
                    const chunk = fullJson.substring(currentIndex, currentIndex + 5);
                    jsonInput.value += chunk;
                    currentIndex += 5;

                    // 自动滚动到底部
                    jsonInput.scrollTop = jsonInput.scrollHeight;

                    // Directly call the processor for incremental update, DO NOT click the button
                    window.processor.process(jsonInput.value);
                } else {
                    // 播放完毕
                    clearInterval(intervalId);
                    intervalId = null;
                    streamBtn.textContent = "流式输入";
                }
            }, speed);

        } catch (error) {
            console.error("Failed to load example JSON:", error);
            alert("加载示例 JSON 文件失败！");
        }
    });
});
