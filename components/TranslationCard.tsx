
import React from "react";
import { TranslationHistoryItem, AppMode, VocabularyItem } from "../types";

interface TranslationCardProps {
  item: TranslationHistoryItem;
  variant?: 'hero' | 'compact';
}

export const TranslationCard: React.FC<TranslationCardProps> = ({ item, variant = 'hero' }) => {
  
  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    window.speechSynthesis.speak(utterance);
  };

  const isHero = variant === 'hero';

  // Base Colors
  const borderColor = item.mode === AppMode.SPEAKING ? 'border-orange-500' : 'border-teal-500';
  
  // Dynamic Styles based on variant
  const containerClass = isHero 
    ? `bg-zinc-900 p-5 rounded-xl border-l-2 ${borderColor} shadow-lg mb-6`
    : `bg-black border border-zinc-800/50 p-3 rounded-lg border-l-2 ${borderColor} border-l-opacity-50 mb-2 opacity-75 hover:opacity-100 transition-all`;

  const mainTextSize = isHero ? "text-2xl" : "text-base";
  const subTextSize = isHero ? "text-sm" : "text-xs";
  const vocabSize = isHero ? "text-[10px] px-2 py-1" : "text-[9px] px-1.5 py-0.5";
  const iconSize = isHero ? "text-lg" : "text-sm";
  const btnSize = isHero ? "p-3" : "p-2";

  return (
    <div className={containerClass}>
        <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
                {/* Main Result (Target Language) */}
                <div className={`${mainTextSize} font-bold text-white mb-1 leading-tight break-words`}>
                {item.translation}
                </div>

                {/* Phonetics */}
                {item.phonetics && (
                <div className={`${subTextSize} text-zinc-400 font-mono bg-zinc-900/50 inline-block px-2 py-0.5 rounded mb-1 border border-zinc-800/50`}>
                    /{item.phonetics}/
                </div>
                )}
                
                {/* Czech Definition (The Triplet Requirement) */}
                <div className={`text-teal-400/90 font-medium mb-2 ${isHero ? 'text-sm' : 'text-xs'}`}>
                    {item.czechDefinition}
                </div>

                {/* Processed Vocabulary Feedback */}
                {item.vocabulary && item.vocabulary.length > 0 && (
                    <div className={`flex flex-wrap gap-1.5 ${isHero ? 'mt-4' : 'mt-2'}`}>
                        {item.vocabulary.map((v: VocabularyItem, idx: number) => {
                            let iconClass = "fa-search";
                            let colorClass = "bg-orange-900/20 border-orange-800 text-orange-400/80";
                            
                            // @ts-ignore - augmenting type for local logic logic preserved
                            const mType = v.matchType || 'none';

                            if (v.status === 'win') {
                                colorClass = "bg-teal-900/20 border-teal-800 text-teal-400/80";
                                if (mType === 'phonetic') {
                                    iconClass = "fa-ear-listen"; // Phonetic Match
                                } else {
                                    iconClass = "fa-check"; // Exact Match
                                }
                            }

                            return (
                                <span 
                                    key={idx} 
                                    className={`${vocabSize} rounded border font-bold ${colorClass} flex items-center gap-1 whitespace-nowrap`}
                                    title={mType === 'phonetic' ? `Phonetic approximation: ${v.inputMatch}` : ''}
                                >
                                    <i className={`fas ${iconClass} text-[8px]`}></i>
                                    <span>{v.word}</span>
                                    {isHero && (
                                        <>
                                            <span className="opacity-40 font-normal text-[8px] mx-1">|</span>
                                            <span className="opacity-80 font-medium">{v.translation}</span>
                                        </>
                                    )}
                                </span>
                            );
                        })}
                    </div>
                )}
            </div>
            <button 
                onClick={() => speakText(item.translation)}
                className={`${btnSize} flex-shrink-0 rounded-full bg-zinc-800/50 ${item.mode === AppMode.SPEAKING ? 'text-orange-500' : 'text-teal-500'} hover:bg-zinc-700 transition-colors`}
            >
                <i className={`fas fa-volume-up ${iconSize}`}></i>
            </button>
        </div>
        
        <div className={`text-zinc-600 text-xs border-t border-zinc-800/50 pt-2 mt-2 flex justify-between items-center ${!isHero ? 'text-[10px]' : ''}`}>
           <span className="truncate pr-4 italic">"{item.original}"</span>
           {!isHero && (
               <span className="opacity-40 whitespace-nowrap">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
           )}
        </div>
    </div>
  );
};
