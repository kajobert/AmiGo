
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
  
  // Dark Mode Base
  let bgClass = "bg-zinc-900 border-zinc-800 hover:border-zinc-600";
  let textClass = "text-zinc-200";
  let secondaryText = "text-zinc-500";
  
  // Heatmap colors (Dark Mode)
  if (!isMastered) {
    if (intensity > 0.7) {
        bgClass = "bg-red-900/20 border-red-900/50 hover:border-red-500";
        textClass = "text-red-100";
        secondaryText = "text-red-400/70";
    } else if (intensity > 0.3) {
        bgClass = "bg-orange-900/20 border-orange-900/50 hover:border-orange-500";
        textClass = "text-orange-100";
        secondaryText = "text-orange-400/70";
    }
  } else {
    // Mastered Styling (Distinct)
    bgClass = "bg-teal-950/40 border border-teal-500/30 hover:border-teal-400 hover:bg-teal-900/50";
    textClass = "text-teal-200";
    secondaryText = "text-teal-500/60";
  }

  // Size variants
  const paddingClass = variant === 'standard' ? "px-3 py-2" : "px-2 py-1";
  const fontSizeClass = variant === 'standard' ? "text-sm" : "text-xs";
  const phoneticsSize = variant === 'standard' ? "text-[10px]" : "text-[9px]";

  // Format used forms
  const hasForms = item.usedForms && item.usedForms.length > 0;
  const formsText = hasForms ? item.usedForms.join(", ") : "";

  return (
    <button 
      onClick={() => onSelect(item.word)}
      className={`group flex flex-col items-start rounded-md shadow-sm transition-all active:scale-95 max-w-full ${bgClass} ${paddingClass}`}
    >
      <div className="flex items-baseline gap-2 w-full">
        {/* 1. Italian Word (Target) */}
        <span className={`font-bold truncate flex items-center gap-2 ${textClass} ${fontSizeClass}`}>
            {item.word}
            {isMastered && <i className="fas fa-check text-[10px] text-teal-400 ml-1"></i>}
        </span>

        {/* 2. Phonetics */}
        {item.phonetics && (
            <span className={`font-mono ${secondaryText} opacity-75 whitespace-nowrap ${phoneticsSize}`}>
            /{item.phonetics}/
            </span>
        )}

        {/* Separator */}
        <span className="text-zinc-700 text-[10px]">|</span>

        {/* 3. Czech Translation (Source) */}
        <span className={`truncate ${secondaryText} ${fontSizeClass}`}>
            {item.translation}
        </span>
      </div>

      <div className="w-full flex justify-between items-end mt-1">
        {/* 4. Used Forms (Merged variations) */}
        <div className={`text-[9px] text-zinc-600 font-medium text-left truncate flex-1 mr-2 ${!hasForms ? 'opacity-0' : ''}`}>
            {variant === 'standard' && hasForms ? `tvar: ${formsText}` : ''}
        </div>

        {/* 5. STATS ROW (Lookups vs Wins) */}
        {variant === 'standard' && (
             <div className="flex gap-3 text-[9px] font-mono bg-black/20 px-1.5 py-0.5 rounded border border-zinc-800/30">
                <span title="Searches (Forgotten)" className="text-orange-400/80 flex items-center gap-1">
                    <i className="fas fa-search text-[8px]"></i> {item.lookups || 0}
                </span>
                <span className="text-zinc-700">/</span>
                <span title="Successes (Mastered)" className="text-teal-400/80 flex items-center gap-1">
                    <i className="fas fa-trophy text-[8px]"></i> {item.wins || 0}
                </span>
             </div>
        )}
      </div>
    </button>
  );
};
