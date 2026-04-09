async function test() {
  const res = await fetch('https://yunwu.ai/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer sk-xFfRUfw3BZ5FHHEBOPYcDPIYPkfgvXpr6VJivgDaLQvrrQye'
    }
  });
  console.log(res.status, await res.text());
}
test();
