
import { WordItem, VocabularyItem } from "../types";

const STORAGE_KEY = "il_vicino_words_v5"; // Updated version key

export const getWords = (): WordItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load words", e);
    return [];
  }
};

export const saveVocabulary = (newItems: VocabularyItem[]): WordItem[] => {
  if (!newItems || newItems.length === 0) return getWords();

  const currentWords = getWords();
  const wordMap = new Map<string, WordItem>();
  
  // Hydrate map from storage
  currentWords.forEach(w => wordMap.set(w.word.toLowerCase(), w));

  newItems.forEach(item => {
    const key = item.word.toLowerCase();
    
    // Basic cleanup
    if (key.length > 1) {
      const existing = wordMap.get(key);
      const observedForm = item.originalForm || item.word;

      // Determine action based on item status
      const isWin = item.status === 'win';
      
      if (existing) {
        const currentLookups = existing.lookups || existing.count; 
        const currentWins = existing.wins || 0;

        let newLookups = currentLookups;
        let newWins = currentWins;

        if (isWin) {
            newWins += 1;
        } else {
            newLookups += 1;
        }

        // Heat Calculation
        const newCount = Math.max(0, Math.floor(newLookups - newWins));

        // Update used forms
        const currentForms = existing.usedForms || [];
        if (!currentForms.includes(observedForm) && observedForm.toLowerCase() !== existing.word.toLowerCase()) {
            currentForms.push(observedForm);
        }

        wordMap.set(key, {
          ...existing,
          translation: existing.translation || item.translation,
          phonetics: existing.phonetics || item.phonetics,
          usedForms: currentForms,
          count: newCount,
          lookups: newLookups,
          wins: newWins,
          lastUsed: Date.now()
        });
      } else {
        // New word
        const initialForms = [];
        if (observedForm.toLowerCase() !== item.word.toLowerCase()) {
            initialForms.push(observedForm);
        }

        let initialLookups = 0;
        let initialWins = 0;

        if (isWin) {
            initialWins = 1;
        } else {
            initialLookups = 1;
        }
        
        const initialCount = Math.max(0, initialLookups - initialWins);

        wordMap.set(key, {
          word: item.word, 
          usedForms: initialForms,
          translation: item.translation,
          phonetics: item.phonetics,
          count: initialCount,
          lookups: initialLookups,
          wins: initialWins,
          lastUsed: Date.now()
        });
      }
    }
  });

  const newHistory = Array.from(wordMap.values());
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch (e) {
    console.error("Failed to save words", e);
  }

  return newHistory;
};

export const clearHistory = (): [] => {
    localStorage.removeItem(STORAGE_KEY);
    return [];
};
