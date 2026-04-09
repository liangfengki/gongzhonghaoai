
async function run() {
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
        content: '排版以下内容：\n原文：\n测试\n![IMG](http://test.com/img.png)\n要求：保持Markdown格式，保留图片。'
      }],
      stream: false
    })
  });
  console.log(res.status, await res.text());
}
run();
