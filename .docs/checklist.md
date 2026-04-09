# Quality Assurance Checklist

## Functional Testing
- [ ] **Topic Generation**: Can generate at least 3 distinct topics from a generic keyword?
- [ ] **Content Consistency**: Does the generated article follow the selected outline?
- [ ] **Image Relevance**: Are generated images relevant to the surrounding text?
- [ ] **Image Quality**: Are images high resolution enough for mobile viewing?

## WeChat Compatibility (Critical)
- [ ] **Copy-Paste**: Does pasting into the WeChat Official Account Editor preserve formatting?
- [ ] **Styles**:
    - [ ] Are H1/H2 headers distinct and styled?
    - [ ] Is paragraph spacing comfortable (line-height ~1.6-1.8)?
    - [ ] Do blockquotes render with the correct border/background?
    - [ ] Do lists (ul/ol) preserve indentation?
- [ ] **Images**: Do images load correctly after pasting? (Note: WeChat may require re-uploading if hosted on ephemeral URLs; for local usage, we might need a workaround or manual upload instruction, but usually copying HTML with base64 or public URLs works for preview, though WeChat eventually requires its own hosting. We will aim for a stable copy workflow).
- [ ] **Mobile Preview**: Does the content look good on a phone screen (simulated)?

## Performance & Usability
- [ ] **Response Time**: Is the UI responsive while waiting for AI generation?
- [ ] **Error Handling**: Do API failures (e.g., timeout, quota) show user-friendly errors?
- [ ] **Editor**: Can the user manually edit the generated text before exporting?
