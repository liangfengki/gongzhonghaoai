const { extractImages, restoreImages } = require('./components-mock.js');
const text = `测试文章
![IMAGE_PROMPT: 描述](placeholder)
正常内容
![真实图片](https://example.com/img.png)`;
const { text: clean, images } = extractImages(text);
console.log("Extracted:", clean);
console.log("Images:", images);
console.log("Restored:", restoreImages(clean, images));
