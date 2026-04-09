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
  onOptimize: (instruction: string, count: number, images: ExtractedImage[], deaiInstruction?: string) => void;
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

    const hasDeai = selectedIds.includes('deai-humanize');
    const otherTemplates = selectedTemplates.filter((t) => t!.id !== 'deai-humanize');
    const deaiTemplate = selectedTemplates.find((t) => t!.id === 'deai-humanize');

    const buildNames = (templates: typeof selectedTemplates) =>
      templates.map((t) => {
        const optKey = t!.id === 'professional-role' ? 'role' : t!.id === 'emotion-shift' ? 'tone' : 'domain';
        const optValue = options[optKey];
        const label = TEMPLATE_OPTIONS[t!.id]?.find((o) => o.value === optValue)?.label;
        return label ? `${t!.name}（${label}）` : t!.name;
      });

    const buildInstruction = (templates: typeof selectedTemplates, names: string[], text: string) => {
      let instr = `请对以下文章进行优化改写，使用以下技法：${names.join('、')}。\n\n`;
      instr += `重要规则：\n`;
      instr += `1. 输出完整的改写后文章，不要缩短或省略任何段落\n`;
      instr += `2. 保留所有标题层级（#、##、###）\n`;
      instr += `3. 绝对不要在正文中使用【XXX】或者"XXX（选定最优方案）："这种标注性质的词语。所有内容必须自然融入正文。\n`;
      if (images.length > 0) {
        instr += `4. 【必须绝对保留】原文中出现的所有形如 [IMG_X] 的图片标记！它们是系统占位符，改写时请务必原样放在最符合上下文的位置，千万不要修改或删除它们。\n\n`;
      } else {
        instr += `\n`;
      }
      for (const t of templates) {
        const optKey = t!.id === 'professional-role' ? 'role' : t!.id === 'emotion-shift' ? 'tone' : 'domain';
        const optValue = options[optKey];
        if (optValue) {
          instr += `- ${t!.name}：${t!.userPromptTemplate('', { [optKey]: optValue }).split('\n\n')[0]}\n`;
        } else {
          instr += `- ${t!.name}：${t!.description}\n`;
        }
      }
      instr += `\n原文：\n${text}`;
      return instr;
    };

    let instruction: string;
    let deaiInstruction: string | undefined;

    if (hasDeai && otherTemplates.length > 0) {
      instruction = buildInstruction(otherTemplates, buildNames(otherTemplates), cleanContent);
      deaiInstruction = deaiTemplate!.userPromptTemplate(cleanContent);
    } else if (hasDeai && otherTemplates.length === 0) {
      instruction = '';
      deaiInstruction = deaiTemplate!.userPromptTemplate(cleanContent);
    } else {
      instruction = buildInstruction(selectedTemplates, buildNames(selectedTemplates), cleanContent);
    }

    onOptimize(instruction, selectedIds.length, images, deaiInstruction);
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
            <p className="text-xs text-gray-400 px-1">点击选择多项，一次性综合应用</p>
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
            {selectedIds.length > 0 ? `开始优化（${selectedIds.length} 项）` : '请先选择优化技法'}
          </button>
        </div>
      </div>
    </div>
  );
}
