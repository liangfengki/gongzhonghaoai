import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image, { ImageOptions } from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import TurndownService from 'turndown';
import TiptapImageNode from './TiptapImageNode';

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
}

export default function TiptapEditor({ content, isStreaming, onChange, onGenerateImage }: Props) {
  const turndownService = useRef(new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }));
  
  // Set up turndown rules for our custom image format
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
      CustomImage.configure({
        onGenerateImage,
      }),
      Placeholder.configure({
        placeholder: '输入正文...',
      }),
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

  // Initialize content
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-14 min-h-[calc(100vh-350px)]">
      <EditorContent editor={editor} />
    </div>
  );
}