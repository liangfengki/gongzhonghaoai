async function test() {
  const res = await fetch('https://yunwu.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye'
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-lite-preview',
      messages: [{role: 'user', content: 'test'}],
      stream: false
    })
  });
  console.log(res.status, await res.text());
}
test();
