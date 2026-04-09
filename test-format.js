async function test() {
  const prompt = `请将以下微信公众号文章内容进行智能排版优化...
原文内容：
测试文章内容。
![测试图片](https://example.com/image.png)
排版要求：保留图片`;

  const res = await fetch('https://yunwu.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye'
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-lite-preview',
      messages: [{role: 'user', content: prompt}],
      stream: false
    })
  });
  console.log(res.status, await res.text());
}
test();
