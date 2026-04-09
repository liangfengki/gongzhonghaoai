const TurndownService = require('turndown');
const ts = new TurndownService();
ts.addRule('image', {
  filter: 'img',
  replacement: function (content, node) {
    return `![${node.getAttribute('alt')}](${node.getAttribute('src')})`;
  }
});
console.log("Turndown output:", ts.turndown('<img src="placeholder" alt="IMAGE_PROMPT: test">'));
