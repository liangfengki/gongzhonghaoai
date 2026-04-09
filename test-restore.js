const { restoreImages } = require('./components-mock.js');
let text = '这是一段测试\n\\[IMG_0\\]\n这是内容\n\\[IMG_1\\]';
const images = [
  { id: '[IMG_0]', original: '![IMAGE_PROMPT: 描述](placeholder)' },
  { id: '[IMG_1]', original: '![真实图片](https://example.com/img.png)' }
];
console.log(restoreImages(text, images));
