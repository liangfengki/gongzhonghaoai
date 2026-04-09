async function test() {
  const res = await fetch('https://yunwu.ai/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer sk-WyOMWvdkpnYR6tATd3cjOHi8TkzeHEMhPRxRR6acXhC5SkGy'
    }
  });
  console.log(res.status, await res.text());
}
test();
