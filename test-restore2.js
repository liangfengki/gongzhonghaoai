function restoreImages(text, images) {
  let restored = text;
  images.forEach(img => {
    // Also remove escaping backslashes if the AI added them
    const escapedIdRegex = new RegExp('\\\\\\[' + img.id.slice(1, -1) + '\\\\\\]', 'g');
    restored = restored.replace(escapedIdRegex, img.id);
    
    // Also replace potential markdown code blocks around it
    const codeBlockRegex = new RegExp('\`' + img.id + '\`', 'g');
    restored = restored.replace(codeBlockRegex, img.id);

    restored = restored.split(img.id).join(img.original);
  });
  return restored;
}
let text = '这是一段测试\n\\[IMG_0\\]\n这是内容\n`[IMG_1]`';
const images = [
  { id: '[IMG_0]', original: '![IMAGE_PROMPT: 描述](placeholder)' },
  { id: '[IMG_1]', original: '![真实图片](https://example.com/img.png)' }
];
console.log(restoreImages(text, images));
