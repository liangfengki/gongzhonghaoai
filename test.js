const TurndownService = require('turndown')
const ts = new TurndownService()
console.log(ts.turndown('<h1>Hello</h1><p>world</p><img src="placeholder" alt="IMAGE_PROMPT: test" />'))
