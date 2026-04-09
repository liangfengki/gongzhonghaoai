async function test() {
  const res = await fetch('https://yunwu.ai/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-WyOMWvdkpnYR6tATd3cjOHi8TkzeHEMhPRxRR6acXhC5SkGy'
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image-preview',
      prompt: '一只可爱的小猫'
    })
  });
  console.log(res.status, await res.text());
}
test();
