
import React from "react";
import { TranslationHistoryItem, AppMode, VocabularyItem } from "../types";
import { motion } from "framer-motion";

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

  // Dynamic Border Colors
  const borderColorClass = item.mode === AppMode.SPEAKING 
    ? "from-orange-500 via-red-500 to-yellow-500" 
    : "from-teal-500 via-cyan-500 to-blue-500";

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`relative rounded-2xl overflow-hidden group ${isHero ? 'mb-6' : 'mb-3'}`}
    >
        {/* Holographic Border Gradient (Subtle) */}
        <div className={`absolute inset-0 bg-gradient-to-br ${borderColorClass} opacity-20 dark:opacity-30`} />
        
        {/* Main Container: White in Light Mode, Glass in Dark Mode */}
        <div className={`relative p-0.5 rounded-2xl h-auto border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl`}>
            
            {/* Inner Content */}
            <div className={`rounded-xl h-auto ${isHero ? 'p-4' : 'p-3'} transition-colors bg-white dark:bg-black/40`}>
                
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                        {/* Result Text */}
                        <h2 className={`${isHero ? 'text-lg' : 'text-sm'} font-bold text-zinc-900 dark:text-white mb-1 leading-tight tracking-tight`}>
                            {item.translation}
                        </h2>

                        {/* Phonetics & Definition */}
                        <div className="flex flex-wrap items-baseline gap-2 mb-2">
                             {item.phonetics && (
                                <span className={`${isHero ? 'text-xs px-2 py-0.5' : 'text-[9px] px-1.5'} font-mono text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-white/5 rounded border border-zinc-200 dark:border-white/5`}>
                                    /{item.phonetics}/
                                </span>
                             )}
                             <span className={`${isHero ? 'text-sm' : 'text-xs'} font-medium ${item.mode === AppMode.SPEAKING ? 'text-orange-600 dark:text-orange-300' : 'text-teal-600 dark:text-teal-300'}`}>
                                 {item.czechDefinition}
                             </span>
                        </div>

                        {/* Vocabulary Chips */}
                        {item.vocabulary && item.vocabulary.length > 0 && (
                            <div className={`flex flex-wrap gap-1.5 ${isHero ? 'mt-3' : 'mt-2'}`}>
                                {item.vocabulary.map((v: VocabularyItem, idx: number) => {
                                    let colorClass = "bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-700 dark:text-orange-200";
                                    let icon = "fa-search";
                                    let ringColor = "text-orange-500";
                                    
                                    if (v.status === 'win') {
                                        colorClass = "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-200";
                                        icon = "fa-check";
                                        ringColor = "text-teal-500";
                                        
                                        if (v.matchType === 'phonetic') {
                                            icon = "fa-ear-listen";
                                            // Adjust ring color based on similarity if available
                                            if (v.similarity && v.similarity < 80) ringColor = "text-yellow-500";
                                        }
                                    }
                                    
                                    const percent = v.similarity || 0;
                                    const circumference = 2 * Math.PI * 4.5; // r=4.5
                                    const offset = circumference - (percent / 100) * circumference;

                                    return (
                                        <span key={idx} className={`${isHero ? 'text-[10px] py-0.5 px-2' : 'text-[9px] px-1.5 py-0.5'} rounded-md border flex items-center gap-1.5 ${colorClass} relative overflow-hidden`}>
                                            
                                            {/* Match Score Indicator */}
                                            {v.status === 'win' && (
                                                <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                                                    <svg className="w-full h-full transform -rotate-90">
                                                        <circle cx="50%" cy="50%" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="transparent" className="opacity-20" />
                                                        <circle cx="50%" cy="50%" r="4.5" stroke="currentColor" strokeWidth="1.5" fill="transparent" 
                                                            strokeDasharray={circumference} 
                                                            strokeDashoffset={offset}
                                                            className={ringColor}
                                                        />
                                                    </svg>
                                                    <i className={`fas ${icon} text-[6px] absolute`}></i>
                                                </div>
                                            )}
                                            
                                            {v.status !== 'win' && <i className={`fas ${icon} text-[8px] opacity-70`}></i>}
                                            
                                            <span className="font-bold">{v.word}</span>
                                            {isHero && <span className="opacity-70 dark:opacity-50 font-normal border-l border-current pl-1.5 ml-0.5">{v.translation}</span>}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Audio Button */}
                    <button 
                        onClick={() => speakText(item.translation)}
                        className={`${isHero ? 'w-8 h-8 text-sm' : 'w-7 h-7 text-xs'} rounded-full flex items-center justify-center bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-700 dark:text-white border border-zinc-200 dark:border-white/5 transition-colors flex-shrink-0`}
                    >
                        <i className="fas fa-volume-up"></i>
                    </button>
                </div>

                {/* Timestamp Footer */}
                <div className={`mt-2 pt-2 border-t border-zinc-100 dark:border-white/5 flex justify-between items-center text-zinc-400 dark:text-zinc-500 ${isHero ? 'text-[10px]' : 'text-[9px]'}`}>
                     <span className="italic opacity-70 truncate max-w-[80%]">"{item.original}"</span>
                     {!isHero && <span>{new Date(item.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>}
                </div>

            </div>
        </div>
    </motion.div>
  );
};