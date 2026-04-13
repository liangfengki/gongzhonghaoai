'use client';

import { useState } from 'react';
import { OPTIMIZER_TEMPLATES, CATEGORY_LABELS, TEMPLATE_OPTIONS } from '@/lib/prompts';
import { generateTextStream, parseSSEStream } from '@/services/ai';
import { useSettings } from '@/lib/settings';
import { useToast } from '@/components/Toast';
import { Loader2, X, Sparkles, Check, Wand2 } from 'lucide-react';
import { extractImages, type ExtractedImage } from './Editor';

interface Props {
  content: string;
  onOptimize: (instruction: string, count: number, images: ExtractedImage[]) => void;
  onClose: () => void;
}

export default function ArticleOptimizer({ content, onOptimize, onClose }: Props) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [options, setOptions] = useState<Record<string, string>>({});

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleOptimize = () => {
    if (selectedIds.length === 0) return;

    const selectedTemplates = selectedIds
      .map((id) => OPTIMIZER_TEMPLATES.find((t) => t.id === id))
      .filter(Boolean);

    const { text: cleanContent, images } = extractImages(content);

    const otherTemplates = selectedTemplates;

    const buildNames = (templates: typeof selectedTemplates) =>
      templates.map((t) => t!.name);

    const buildInstruction = (templates: typeof selectedTemplates, names: string[], text: string) => {
      // Use the first selected template's full prompt as the instruction
      const template = templates[0]!;
      let instr = template.userPromptTemplate(text);
      if (images.length > 0) {
        instr += `\n\n【必须绝对保留】原文中出现的所有形如 [IMG_X] 的图片标记！它们是系统占位符，改写时请务必原样放在最符合上下文的位置，千万不要修改或删除它们。`;
      }
      return instr;
    };

    const instruction = buildInstruction(selectedTemplates, buildNames(selectedTemplates), cleanContent);

    onOptimize(instruction, selectedIds.length, images);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div
        className="relative w-[420px] bg-white h-full shadow-2xl flex flex-col animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wand2 size={18} className="text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-800">文章优化</h2>
            {selectedIds.length > 0 && (
              <span className="text-[11px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                已选 {selectedIds.length} 项
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            <p className="text-xs text-gray-400 px-1">选择一个改写版本</p>
              {Object.entries(CATEGORY_LABELS).map(([catKey, catInfo]) => {
                const templates = OPTIMIZER_TEMPLATES.filter((t) => t.category === catKey);
                return (
                  <div key={catKey}>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{catInfo.name}</p>
                    <div className="space-y-1.5">
                      {templates.map((template) => {
                        const isSelected = selectedIds.includes(template.id);
                        const optKey = template.id === 'professional-role' ? 'role' : template.id === 'emotion-shift' ? 'tone' : 'domain';
                        const hasOptions = TEMPLATE_OPTIONS[template.id];
                        return (
                          <div key={template.id}>
                            <button
                              onClick={() => toggleSelect(template.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
                                isSelected
                                  ? 'bg-indigo-50 border border-indigo-200'
                                  : 'hover:bg-gray-50 border border-transparent'
                              }`}
                            >
                              <span className="text-lg flex-shrink-0">{template.icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>{template.name}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{template.description}</p>
                              </div>
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${
                                isSelected
                                  ? 'bg-indigo-500 text-white'
                                  : 'border border-gray-200 group-hover:border-gray-300'
                              }`}>
                                {isSelected && <Check size={12} strokeWidth={3} />}
                              </div>
                            </button>
                            {isSelected && hasOptions && (
                              <div className="ml-10 mt-1.5 mb-1 flex flex-wrap gap-1.5">
                                {TEMPLATE_OPTIONS[template.id].map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOptions((prev) => ({ ...prev, [optKey]: opt.value }));
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                                      options[optKey] === opt.value
                                        ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleOptimize}
            disabled={selectedIds.length === 0}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles size={15} />
            {selectedIds.length > 0 ? `开始改写` : '请先选择改写版本'}
          </button>
        </div>
      </div>
    </div>
  );
}
