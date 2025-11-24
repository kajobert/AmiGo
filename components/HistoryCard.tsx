
import React from "react";
import { WordItem } from "../types";

interface WordChipProps {
  item: WordItem;
  maxCount: number;
  onSelect: (text: string) => void;
  variant?: 'standard' | 'compact';
}

export const WordChip: React.FC<WordChipProps> = ({ item, maxCount, onSelect, variant = 'standard' }) => {
  // Heatmap Logic
  const intensity = Math.min(item.count / Math.max(maxCount, 1), 1);
  const isMastered = item.count === 0;
  
  // Base Classes (Dynamic CSS Vars would handle bg, but specific tints need classes)
  let containerClass = "prismatic-card hover:bg-opacity-80 transition-all active:scale-95";
  let textClass = "";
  let iconClass = "";
  
  // Color Logic
  if (!isMastered) {
    if (intensity > 0.7) {
        containerClass += " bg-red-500/10 border-red-500/20";
        textClass = "text-red-500";
        iconClass = "text-red-400";
    } else {
        containerClass += " bg-orange-500/10 border-orange-500/20";
        textClass = "text-orange-500";
        iconClass = "text-orange-400";
    }
  } else {
    containerClass += " bg-teal-500/10 border-teal-500/20";
    textClass = "text-teal-600 dark:text-teal-400";
    iconClass = "text-teal-500";
  }

  const paddingClass = variant === 'standard' ? "px-3 py-2" : "px-2 py-1";
  const fontSizeClass = variant === 'standard' ? "text-sm" : "text-xs";

  const hasForms = item.usedForms && item.usedForms.length > 0;
  const formsText = hasForms ? item.usedForms.join(", ") : "";

  return (
    <button 
      onClick={() => onSelect(item.word)}
      className={`group flex flex-col items-start rounded-lg text-left max-w-full ${containerClass} ${paddingClass}`}
    >
      <div className="flex items-baseline gap-2 w-full">
        <span className={`font-bold truncate flex items-center gap-1 ${textClass} ${fontSizeClass}`}>
            {item.word}
            {isMastered && <i className={`fas fa-check text-[10px] ${iconClass}`}></i>}
        </span>

        {item.phonetics && (
            <span className={`font-mono opacity-50 text-[10px] whitespace-nowrap`}>
            /{item.phonetics}/
            </span>
        )}

        <span className="opacity-20 text-[10px]">|</span>

        <span className={`truncate opacity-80 ${fontSizeClass}`}>
            {item.translation}
        </span>
      </div>

      <div className="w-full flex justify-between items-end mt-1 opacity-70">
        <div className={`text-[9px] font-medium text-left truncate flex-1 mr-2 ${!hasForms ? 'opacity-0' : ''}`}>
            {variant === 'standard' && hasForms ? `tvar: ${formsText}` : ''}
        </div>

        {variant === 'standard' && (
             <div className="flex gap-2 text-[9px] font-mono px-1.5 rounded bg-black/5 dark:bg-white/5">
                <span title="Searches" className={`${!isMastered ? 'text-orange-500' : 'opacity-50'}`}>
                    <i className="fas fa-search text-[8px]"></i> {item.lookups || 0}
                </span>
                <span title="Wins" className="text-teal-500">
                    <i className="fas fa-trophy text-[8px]"></i> {item.wins || 0}
                </span>
             </div>
        )}
      </div>
    </button>
  );
};
