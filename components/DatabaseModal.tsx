
import React, { useMemo, useState } from "react";
import { WordItem, UserProfile } from "../types";
import { WordChip } from "./HistoryCard";
import { UI_STRINGS } from "../translations";

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onSelect: (text: string) => void;
  profile: UserProfile; // Added profile for lang/theme detection if needed
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose, words, onSelect, profile }) => {
  const [search, setSearch] = useState("");
  const t = UI_STRINGS[profile.uiLanguage];

  const { critical, mastered, maxCount } = useMemo(() => {
    const filtered = words.filter(w => 
      w.word.toLowerCase().includes(search.toLowerCase()) || 
      w.translation?.toLowerCase().includes(search.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => b.count - a.count);
    const max = sorted.length > 0 ? sorted[0].count : 1;
    const critical = sorted.filter(w => w.count > 0);
    const mastered = sorted.filter(w => w.count === 0);
    return { critical, mastered, maxCount: max };
  }, [words, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="prismatic-card prismatic-border w-full max-w-lg h-[90vh] rounded-3xl flex flex-col overflow-hidden bg-white/95 dark:bg-black/90 text-zinc-900 dark:text-zinc-100 transition-colors shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-white/5 flex justify-between items-center bg-zinc-50 dark:bg-white/5">
          <div>
             <h2 className="text-lg font-bold">{t.vocabulary}</h2>
             <p className="text-xs opacity-50">{words.length} {t.wordsStored}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fas fa-times"></i></button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/5">
            <div className="relative">
                <i className="fas fa-search absolute left-4 top-3.5 text-zinc-500 text-xs"></i>
                <input 
                    type="text" 
                    placeholder={t.searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-sm focus:outline-none focus:border-teal-500/50 transition-colors placeholder-zinc-500 dark:placeholder-zinc-400 text-zinc-900 dark:text-zinc-100"
                />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
            {critical.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                        <i className="fas fa-fire"></i> {t.learning} ({critical.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {critical.map(item => (<WordChip key={item.word} item={item} maxCount={maxCount} onSelect={(t) => { onSelect(t); onClose(); }} variant="standard" />))}
                    </div>
                </div>
            )}

            {mastered.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                        <i className="fas fa-check-circle"></i> {t.mastered} ({mastered.length})
                    </h3>
                    <div className="flex flex-wrap gap-2 opacity-80">
                        {mastered.map(item => (<WordChip key={item.word} item={item} maxCount={1} onSelect={(t) => { onSelect(t); onClose(); }} variant="standard" />))}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
