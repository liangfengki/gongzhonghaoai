const TurndownService = require('turndown');
const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndownService.addRule('image', {
  filter: 'img',
  replacement: function (content, node) {
    const src = node.getAttribute('src') || '';
    const alt = node.getAttribute('alt') || '';
    return `![${alt}](${src})`;
  }
});
console.log(turndownService.turndown('<p><img src="placeholder" alt="IMAGE_PROMPT: test"></p>'));
console.log(turndownService.turndown('<p><img src="https://example.com/img.png" alt="图片"></p>'));
