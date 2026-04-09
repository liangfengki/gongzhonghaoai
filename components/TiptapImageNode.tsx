import { NodeViewWrapper } from '@tiptap/react';
import { Image as ImageIcon, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function TiptapImageNode(props: any) {
  const { src, alt } = props.node.attrs;
  const isPlaceholder = src === 'placeholder' || !src;
  const prompt = alt?.replace('IMAGE_PROMPT: ', '').trim() || '';
  
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!props.extension.options.onGenerateImage) return;
    setGenerating(true);
    try {
      const newUrl = await props.extension.options.onGenerateImage(prompt);
      props.updateAttributes({ src: newUrl, alt: prompt });
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  if (!isPlaceholder) {
    return (
      <NodeViewWrapper className="my-4 rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm group/img relative" as="div">
        <img src={src} alt={alt} className="w-full h-auto block" />
        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover/img:opacity-100">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-white/95 text-gray-800 px-4 py-2 rounded-xl text-sm font-medium hover:bg-white flex items-center gap-2 shadow-lg backdrop-blur-sm disabled:opacity-50 transition-all"
          >
            {generating ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
            {generating ? '生成中...' : '重新生成'}
          </button>
        </div>
        {prompt && (
          <div className="px-4 py-2.5 border-t border-gray-50 flex items-center justify-between">
            <p className="text-xs text-gray-400 truncate">{prompt}</p>
            <button
              onClick={() => props.updateAttributes({ src: 'placeholder', alt: `IMAGE_PROMPT: ${prompt}` })}
              className="text-xs text-gray-400 hover:text-red-500 ml-2 flex-shrink-0 transition-colors"
            >
              移除
            </button>
          </div>
        )}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="my-4 rounded-xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50 overflow-hidden transition-all hover:border-gray-300 hover:shadow-sm" as="div">
      <div className="flex items-center gap-4 p-5">
        <div className="w-14 h-14 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center flex-shrink-0">
          <ImageIcon size={22} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-0.5">图片占位符</p>
          <input
            type="text"
            value={prompt}
            onChange={(e) => props.updateAttributes({ alt: `IMAGE_PROMPT: ${e.target.value}` })}
            className="w-full text-xs text-gray-500 bg-white border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-blue-400"
            placeholder="描述你想要的画面..."
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex-shrink-0 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 transition-all shadow-sm hover:shadow-md active:scale-[0.97]"
        >
          {generating ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
          {generating ? '生成中...' : '生成图片'}
        </button>
      </div>
    </NodeViewWrapper>
  );
}