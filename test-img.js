const fetch = require('node-fetch');
async function test() {
  const res = await fetch('http://localhost:3535/api/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: '一只可爱的小猫',
      settings: { imageApiKey: 'demo' } // Force it to use the built-in one
    })
  });
  console.log(res.status, await res.text());
}
test();
