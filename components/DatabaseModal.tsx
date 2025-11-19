import React, { useMemo, useState } from "react";
import { WordItem } from "../types";
import { WordChip } from "./HistoryCard";

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onSelect: (text: string) => void;
}

export const DatabaseModal: React.FC<DatabaseModalProps> = ({ isOpen, onClose, words, onSelect }) => {
  const [search, setSearch] = useState("");

  const { critical, mastered, maxCount } = useMemo(() => {
    const filtered = words.filter(w => 
      w.word.toLowerCase().includes(search.toLowerCase()) || 
      w.translation?.toLowerCase().includes(search.toLowerCase())
    );
    
    // Sort by count (descending)
    const sorted = [...filtered].sort((a, b) => b.count - a.count);
    
    const max = sorted.length > 0 ? sorted[0].count : 1;
    
    // Split into "Critical" (Count > 0) and "Mastered" (Count == 0)
    const critical = sorted.filter(w => w.count > 0);
    const mastered = sorted.filter(w => w.count === 0);

    return { critical, mastered, maxCount: max };
  }, [words, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-black border border-zinc-800 w-full max-w-lg h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
          <div>
             <h2 className="text-lg font-bold text-zinc-100">Vocabulary</h2>
             <p className="text-xs text-zinc-500">{words.length} words stored</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Search */}
        <div className="p-3 bg-black border-b border-zinc-800">
            <div className="relative">
                <i className="fas fa-search absolute left-3 top-3 text-zinc-500 text-xs"></i>
                <input 
                    type="text" 
                    placeholder="Search words..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm focus:outline-none focus:border-teal-600 placeholder-zinc-600"
                />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-800">
            
            {/* Critical Section */}
            {critical.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                        <i className="fas fa-fire"></i> Learning ({critical.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {critical.map(item => (
                            <WordChip 
                                key={item.word}
                                item={item}
                                maxCount={maxCount}
                                onSelect={(t) => { onSelect(t); onClose(); }}
                                variant="standard"
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Mastered Section */}
            {mastered.length > 0 && (
                <div>
                    <h3 className="text-[10px] font-bold text-teal-500 uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                        <i className="fas fa-check-circle"></i> Mastered ({mastered.length})
                    </h3>
                    <div className="flex flex-wrap gap-2 opacity-80">
                        {mastered.map(item => (
                             <WordChip 
                                key={item.word}
                                item={item}
                                maxCount={1} // Always low intensity
                                onSelect={(t) => { onSelect(t); onClose(); }}
                                variant="standard" // Changed to standard to show translation and full bar style
                            />
                        ))}
                    </div>
                </div>
            )}

            {critical.length === 0 && mastered.length === 0 && (
                <div className="text-center py-20 text-zinc-700">
                    <i className="fas fa-book-open text-4xl mb-4 opacity-20"></i>
                    <p>No words found.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};