async function test() {
  const res = await fetch('https://yunwu.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye'
    },
    body: JSON.stringify({
      prompt: '一只可爱的小猫',
      n: 1,
      size: '1024x1024'
    })
  });
  console.log(res.status, await res.text());
}
test();
