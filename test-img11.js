async function test() {
  console.log("Fetching...");
  const res = await fetch('https://yunwu.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer sk-WyOMWvdkpnYR6tATd3cjOHi8TkzeHEMhPRxRR6acXhC5SkGy'
    },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image-preview',
      messages: [{ role: 'user', content: 'Generate an image: 一只可爱的小猫' }]
    })
  });
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}
test();
