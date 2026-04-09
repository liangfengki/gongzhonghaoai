function extractImages(content) {
  const images = [];
  const text = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match) => {
    const id = `[IMG_${images.length}]`;
    images.push({ id, original: match });
    return id;
  });
  return { text, images };
}
function restoreImages(text, images) {
  let restored = text;
  images.forEach(img => {
    restored = restored.split(img.id).join(img.original);
  });
  return restored;
}
module.exports = { extractImages, restoreImages };
