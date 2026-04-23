'use client';

import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image, { ImageOptions } from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useState, useCallback } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import TiptapImageNode from './TiptapImageNode';
import { RotateCcw, Loader2 } from 'lucide-react';

declare module '@tiptap/core' {
  interface NodeConfig<Options, Storage> {
    onGenerateImage?: (prompt: string) => Promise<string>;
  }
}

interface CustomImageOptions extends ImageOptions {
  onGenerateImage: ((prompt: string) => Promise<string>) | null;
}

const CustomImage = Image.extend<CustomImageOptions>({
  addOptions() {
    return {
      ...this.parent?.() as ImageOptions,
      onGenerateImage: null,
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(TiptapImageNode);
  },
});

interface Props {
  content: string;
  isStreaming?: boolean;
  onChange: (content: string) => void;
  onGenerateImage: (prompt: string) => Promise<string>;
  onRewrite?: (paragraphIndex: number, instruction: string) => Promise<void>;
  rewritingIndex?: number | null;
}

export default function TiptapEditor({ content, isStreaming, onChange, onGenerateImage, onRewrite, rewritingIndex }: Props) {
  const turndownService = useRef(new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }));
  const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null);
  const [rewritingInput, setRewritingInput] = useState<number | null>(null);
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
    turndownService.current.addRule('image', {
      filter: 'img',
      replacement: function (content, node: any) {
        const src = node.getAttribute('src') || '';
        const alt = node.getAttribute('alt') || '';
        return `![${alt}](${src})`;
      }
    });
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      CustomImage.configure({ onGenerateImage }),
      Placeholder.configure({ placeholder: '输入正文...' }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none tiptap-editor',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const markdown = turndownService.current.turndown(html);
      onChange(markdown);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const shouldUpdate = isStreaming || !editor.isFocused;
    if (shouldUpdate) {
      const currentMarkdown = turndownService.current.turndown(editor.getHTML());
      if (content !== currentMarkdown) {
        const html = marked.parse(content || '') as string;
        editor.commands.setContent(html, { emitUpdate: false });
      }
    }
  }, [content, editor, isStreaming]);

  // Detect which paragraph the mouse is over
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!editor) return;
    const editorEl = editor.view.dom;
    const blocks = editorEl.querySelectorAll('p, h1, h2, h3, h4, blockquote');
    let found = -1;
    blocks.forEach((block, idx) => {
      const rect = block.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
        found = idx;
      }
    });
    setHoveredParagraph(found >= 0 ? found : null);
  }, [editor]);

  const handleRewrite = async (paraIdx: number) => {
    if (!onRewrite || !instruction.trim()) return;
    setRewritingInput(null);
    setInstruction('');
    await onRewrite(paraIdx, instruction.trim());
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-14 min-h-[calc(100vh-350px)] relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredParagraph(null)}
    >
      <EditorContent editor={editor} />

      {/* Floating rewrite button */}
      {onRewrite && hoveredParagraph !== null && !isStreaming && rewritingIndex == null && (
        <div
          className="absolute right-4 md:right-8 z-20"
          style={{
            top: (() => {
              if (!editor) return 0;
              const blocks = editor.view.dom.querySelectorAll('p, h1, h2, h3, h4, blockquote');
              const block = blocks[hoveredParagraph];
              if (!block) return 0;
              const editorRect = editor.view.dom.closest('.relative')?.getBoundingClientRect();
              const blockRect = block.getBoundingClientRect();
              return editorRect ? blockRect.top - editorRect.top : 0;
            })(),
          }}
        >
          {rewritingInput === hoveredParagraph ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 w-64 animate-scale-in">
              <input
                type="text"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRewrite(hoveredParagraph); if (e.key === 'Escape') { setRewritingInput(null); setInstruction(''); } }}
                placeholder="重写要求（留空则默认优化）"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleRewrite(hoveredParagraph)}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-medium"
                >重写</button>
                <button
                  onClick={() => { setRewritingInput(null); setInstruction(''); }}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >取消</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRewritingInput(hoveredParagraph)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white rounded-lg shadow-md border border-gray-200 text-gray-500 hover:text-blue-600 hover:border-blue-200 text-xs font-medium transition-all"
            >
              <RotateCcw size={12} />
              重写
            </button>
          )}
        </div>
      )}

      {/* Rewriting indicator */}
      {rewritingIndex != null && (
        <div className="absolute top-4 right-4 md:right-8 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-600 font-medium shadow-sm">
          <Loader2 size={14} className="animate-spin" />
          正在重写第 {rewritingIndex + 1} 段...
        </div>
      )}
    </div>
  );
}
