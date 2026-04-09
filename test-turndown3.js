const TurndownService = require('turndown');
const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

const html = '<p>![IMAGE_PROMPT: test](placeholder)</p>';
console.log(turndownService.turndown(html));
