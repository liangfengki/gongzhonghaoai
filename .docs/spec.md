# Personal 01Agent - AI Content Creation Platform Specification

## 1. Project Overview
A personal, local-first AI content creation platform designed to automate the workflow of topic selection, writing, image generation, and layout formatting for WeChat Official Accounts (公众号). The goal is to produce high-quality, formatted content that can be directly copied to the WeChat editor without layout shifts.

## 2. Core Features

### 2.1 Automated Topic Selection (选题)
- **Input**: User provides keywords or broad categories.
- **Process**:
  - Optional: Fetch trending topics from external sources (e.g., via API or manual input).
  - AI analyzes trends/keywords and suggests 3-5 specific article titles and angles.
- **Output**: List of selectable topics with brief outlines.

### 2.2 Automated Writing (写作)
- **Input**: Selected topic + Outline.
- **Process**:
  - AI generates full article content based on a structured prompt (Introduction, Body Paragraphs, Conclusion).
  - Support for different tones (Professional, Casual, Storytelling).
  - iterative refinement: User can request rewrites of specific sections.
- **Output**: Structured Markdown text.

### 2.3 Automated Image Generation (配图)
- **Input**: Article context / specific paragraphs.
- **Process**:
  - AI analyzes text to generate image prompts.
  - Call Image Generation API (e.g., DALL-E 3, Stable Diffusion).
  - Generate a Cover Image (16:9 or 2.35:1) and insertion images.
- **Output**: Image files (stored locally) embedded in the content.

### 2.4 Layout & Formatting (排版)
- **Constraint**: Must be compatible with WeChat Official Account editor (inline styles, no external CSS classes).
- **Features**:
  - Pre-defined themes (Minimalist, Tech, Literature).
  - Automatic application of styles to headers (H1, H2), paragraphs, quotes, and lists.
  - Image styling (rounded corners, shadows, captions).
  - Code block highlighting (if applicable).
- **Implementation**: Convert Markdown to HTML with inline CSS styles specifically tuned for WeChat.

### 2.5 Export (导出)
- **Function**: "One-Click Copy" to clipboard.
- **Format**: HTML with inline styles.
- **Verification**: Ensure pasted content in WeChat Editor retains all formatting.

## 3. Technical Architecture

### 3.1 Tech Stack
- **Frontend**: Next.js (React) - for a responsive and interactive UI.
- **Styling**: Tailwind CSS (for the app UI) + Custom Inline Styles (for the generated content).
- **Backend/API**: Next.js API Routes (Serverless functions) or Python FastAPI (if local local LLM/SD is needed later). *Starting with Next.js API Routes for simplicity.*
- **AI Integration**: OpenAI API (GPT-4o for text, DALL-E 3 for images) or compatible local APIs.
- **State Management**: React Context / Zustand.
- **Storage**: LocalStorage (for drafts) or simple JSON file system.

### 3.2 Data Flow
1.  **User** inputs Keyword -> **App** requests Topic Suggestions (LLM).
2.  **User** selects Topic -> **App** requests Outline (LLM).
3.  **User** approves Outline -> **App** requests Full Content (LLM).
4.  **App** parses Content -> **App** requests Image Prompts (LLM) -> **App** requests Images (DALL-E).
5.  **App** renders Preview using **WeChat-compatible Renderer**.
6.  **User** clicks Copy -> **App** copies HTML to clipboard.

## 4. UI/UX Design
- **Sidebar**: History/Drafts.
- **Main Area**: Chat-like interface for generation + WYSIWYG Editor for refinement.
- **Right Panel**: Settings (API Keys, Theme Selection, Export Options).

## 5. WeChat Compatibility Strategy
- Use `juice` or similar library to inline CSS.
- Avoid unsupported HTML tags (e.g., `<style>`, `<script>`, complex `div` layouts).
- Use `background-image` cautiously; prefer `<img>` tags.
- Test against WeChat's specific rendering quirks (line-height, margin collapsing).
