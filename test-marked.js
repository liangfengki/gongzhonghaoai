const { marked } = require('marked');
console.log(marked.parse('![IMAGE_PROMPT: test](placeholder)'));
console.log(marked.parse('![图片](https://example.com/img.png)'));
