# Implementation Tasks

## Phase 1: Project Setup & Core Logic
- [ ] **Initialize Next.js Project**: Set up TypeScript, Tailwind CSS, and project structure. <!-- id: 1 -->
- [ ] **Configure AI Clients**: Setup OpenAI SDK (or generic handler) for Text and Image generation. <!-- id: 2 -->
- [ ] **Implement State Management**: Design store for Article state (title, content, images, status). <!-- id: 3 -->

## Phase 2: Content Generation Modules
- [ ] **Develop Topic Selection Module**: UI for keywords input and API logic to fetch suggestions. <!-- id: 4 -->
- [ ] **Develop Writing Module**:
    - [ ] Outline Generation Logic. <!-- id: 5 -->
    - [ ] Full Article Generation Logic (Markdown streaming). <!-- id: 6 -->
- [ ] **Develop Image Generation Module**:
    - [ ] Prompt generation from text context. <!-- id: 7 -->
    - [ ] Image generation API integration. <!-- id: 8 -->
    - [ ] Image display and replacement UI. <!-- id: 9 -->

## Phase 3: Layout & Export (Crucial for WeChat)
- [ ] **Develop WeChat Renderer**:
    - [ ] Create Markdown-to-HTML converter. <!-- id: 10 -->
    - [ ] Implement CSS Inliner (using `juice` or similar). <!-- id: 11 -->
    - [ ] Design 2 default themes (Minimalist, Professional) with WeChat-safe CSS. <!-- id: 12 -->
- [ ] **Implement Export Feature**:
    - [ ] "Copy to Clipboard" functionality with HTML MIME type. <!-- id: 13 -->
    - [ ] Preview mode simulating WeChat mobile view. <!-- id: 14 -->

## Phase 4: Refinement & Polish
- [ ] **Save/Load System**: Persist drafts to local storage. <!-- id: 15 -->
- [ ] **UI Polish**: Improve transitions and loading states. <!-- id: 16 -->
- [ ] **Final Verification**: Test copying to actual WeChat Editor. <!-- id: 17 -->
