function stripMarkdownWrapper(text) {
  let clean = text.trim();
  if (clean.startsWith('```markdown')) {
    clean = clean.substring(11).trim();
  } else if (clean.startsWith('```')) {
    clean = clean.substring(3).trim();
  }
  if (clean.endsWith('```')) {
    clean = clean.substring(0, clean.length - 3).trim();
  }
  return clean;
}
console.log(stripMarkdownWrapper('```markdown\n# Title\n![IMG](placeholder)\n```'));
console.log(stripMarkdownWrapper('Just text\n`![IMG](placeholder)`'));
