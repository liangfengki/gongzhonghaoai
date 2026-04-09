async function run() {
  const fetch = require('node-fetch');
  const res = await fetch('https://yunwu.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye'
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-lite-preview',
      messages: [{
        role: 'user', 
        content: `请将以下微信公众号文章内容进行智能排版优化，使其更适合微信阅读。
当前要求的排版风格为：【极简清晰】（短句为主，多用列表，重点突出，适合快速阅读）

原文内容：
测试内容
![IMAGE_PROMPT: 测试图](placeholder)
![真实的图片](https://example.com/img.png)

排版要求：
1. 保持原有核心内容不变，但可以根据【极简清晰】风格调整段落长短和语气节奏。
2.async fun?落结构，使阅读更流畅。
3. 【必? const fetch = requi??  const res = await fetch('https://yunwu.?   method: 'POST',
    headers: {
      'Content-Type': T: headers: {