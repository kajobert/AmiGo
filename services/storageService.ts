
import { WordItem, VocabularyItem, TranslationHistoryItem, UserProfile, Badge, TargetLanguage, DailyStats } from "../types";

const WORD_STORAGE_KEY = "amigo_words_v1";
const HISTORY_STORAGE_KEY = "amigo_history_v1";
const PROFILE_STORAGE_KEY = "amigo_profile_v1";
const STATS_STORAGE_KEY = "amigo_stats_v1";

const DEFAULT_BADGES: Badge[] = [
  { id: 'first_step', name: 'První Krok', icon: 'fa-shoe-prints', description: 'First translation completed', unlocked: false },
  { id: 'novice', name: 'Turista', icon: 'fa-camera', description: 'Saved 10 words', unlocked: false },
  { id: 'talkative', name: 'Ucaný', icon: 'fa-comment-dots', description: '50 translations', unlocked: false },
  { id: 'master', name: 'Místní', icon: 'fa-medal', description: 'Mastered 5 words', unlocked: false },
  { id: 'streak_3', name: 'On Fire', icon: 'fa-fire', description: '3 Day Streak', unlocked: false },
];

const DEFAULT_PROFILE: UserProfile = {
  name: 'AmiGo',
  avatar: '🛵',
  xp: 0,
  level: 1,
  badges: DEFAULT_BADGES,
  uiLanguage: 'cs',
  targetLanguage: 'it'
};

// --- DAILY STATS & ENERGY ---

export const getDailyStats = (): DailyStats => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const stored = localStorage.getItem(STATS_STORAGE_KEY);
        if (stored) {
            const stats: DailyStats = JSON.parse(stored);
            if (stats.date !== today) {
                // New day! Reset energy, check streak
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];
                
                let newStreak = stats.streak;
                if (stats.lastStreakDate === yesterdayStr) {
                    // Streak continues (only increment on action, not just load)
                } else if (stats.lastStreakDate !== today) {
                     // Streak broken if not today and not yesterday
                     newStreak = 0; 
                }

                return {
                    date: today,
                    energyUsed: 0,
                    streak: newStreak,
                    lastStreakDate: stats.lastStreakDate
                };
            }
            return stats;
        }
    } catch(e) {}
    
    return { date: today, energyUsed: 0, streak: 0, lastStreakDate: '' };
};

export const consumeEnergy = (): DailyStats => {
    const stats = getDailyStats();
    const today = new Date().toISOString().split('T')[0];
    
    let newStreak = stats.streak;
    let lastStreakDate = stats.lastStreakDate;

    // If first action of the day, increment streak
    if (lastStreakDate !== today) {
        newStreak += 1;
        lastStreakDate = today;
    }

    const newStats = {
        ...stats,
        energyUsed: stats.energyUsed + 1,
        streak: newStreak,
        lastStreakDate: lastStreakDate
    };
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(newStats));
    return newStats;
}

// --- PROFILE ---

export const getUserProfile = (): UserProfile => {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const mergedBadges = DEFAULT_BADGES.map(defBadge => {
        const existing = parsed.badges?.find((b: Badge) => b.id === defBadge.id);
        return existing ? existing : defBadge;
      });
      return { ...parsed, badges: mergedBadges };
    }
    return DEFAULT_PROFILE;
  } catch (e) {
    return DEFAULT_PROFILE;
  }
};

export const saveUserProfile = (profile: UserProfile): void => {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("Failed to save profile", e);
  }
};

export const addXP = (amount: number): UserProfile => {
  const profile = getUserProfile();
  let newXP = profile.xp + amount;
  let newLevel = Math.floor(newXP / 100) + 1;
  
  const updated = { ...profile, xp: newXP, level: newLevel };
  saveUserProfile(updated);
  return updated;
};

export const checkBadges = (words: WordItem[], historyCount: number, streak: number): { profile: UserProfile, newBadges: Badge[] } => {
  const profile = getUserProfile();
  const newBadges: Badge[] = [];
  let updatedBadges = [...profile.badges];
  let changed = false;

  const masteredCount = words.filter(w => w.count === 0).length;
  const totalWords = words.length;
  
  const unlock = (id: string) => {
    const idx = updatedBadges.findIndex(b => b.id === id);
    if (idx !== -1 && !updatedBadges[idx].unlocked) {
      updatedBadges[idx] = { ...updatedBadges[idx], unlocked: true, dateUnlocked: Date.now() };
      newBadges.push(updatedBadges[idx]);
      changed = true;
    }
  };

  if (historyCount >= 1) unlock('first_step');
  if (totalWords >= 10) unlock('novice');
  if (historyCount >= 50) unlock('talkative');
  if (masteredCount >= 5) unlock('master');
  if (streak >= 3) unlock('streak_3');

  if (changed) {
    const updatedProfile = { ...profile, badges: updatedBadges };
    saveUserProfile(updatedProfile);
    return { profile: updatedProfile, newBadges };
  }
  
  return { profile, newBadges: [] };
};

// --- VOCABULARY ---

export const getAllWords = (): WordItem[] => {
  try {
    const stored = localStorage.getItem(WORD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) { return []; }
}

export const getWords = (lang: TargetLanguage): WordItem[] => {
  const all = getAllWords();
  // Filter by language (or return all if legacy/missing lang)
  return all.filter(w => w.language === lang || !w.language);
};

export const saveVocabulary = (newItems: VocabularyItem[], lang: TargetLanguage): WordItem[] => {
  if (!newItems || newItems.length === 0) return getWords(lang);

  const allWords = getAllWords();
  // Separate current lang words from others
  const otherLangWords = allWords.filter(w => w.language && w.language !== lang);
  const currentLangWords = allWords.filter(w => w.language === lang || !w.language);

  const wordMap = new Map<string, WordItem>();
  currentLangWords.forEach(w => wordMap.set(w.word.toLowerCase(), w));

  newItems.forEach(item => {
    const key = item.word.toLowerCase();
    if (key.length > 1) {
      const existing = wordMap.get(key);
      const observedForm = item.originalForm || item.word;
      const isWin = item.status === 'win';
      
      if (existing) {
        let newLookups = existing.lookups || existing.count; 
        let newWins = existing.wins || 0;
        if (isWin) newWins += 1; else newLookups += 1;
        const newCount = Math.max(0, Math.floor(newLookups - newWins));
        const currentForms = existing.usedForms || [];
        if (!currentForms.includes(observedForm) && observedForm.toLowerCase() !== existing.word.toLowerCase()) {
            currentForms.push(observedForm);
        }
        wordMap.set(key, {
          ...existing,
          language: lang, // Ensure tag
          usedForms: currentForms, count: newCount, lookups: newLookups, wins: newWins, lastUsed: Date.now()
        });
      } else {
        let initialLookups = 0, initialWins = 0;
        if (isWin) initialWins = 1; else initialLookups = 1;
        const initialCount = Math.max(0, initialLookups - initialWins);
        wordMap.set(key, {
          word: item.word, language: lang, usedForms: [observedForm], translation: item.translation, phonetics: item.phonetics,
          count: initialCount, lookups: initialLookups, wins: initialWins, lastUsed: Date.now()
        });
      }
    }
  });

  const newCurrentWords = Array.from(wordMap.values());
  const finalStorage = [...otherLangWords, ...newCurrentWords];
  
  localStorage.setItem(WORD_STORAGE_KEY, JSON.stringify(finalStorage));
  return newCurrentWords; // Return only current lang for UI
};

// --- HISTORY ---

export const getTranslationHistory = (lang?: TargetLanguage): TranslationHistoryItem[] => {
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        const allHistory: TranslationHistoryItem[] = stored ? JSON.parse(stored) : [];
        
        if (lang) {
            // Filter by language, or allow legacy items that might miss the tag (though in this version we ensure it)
            return allHistory.filter(h => h.targetLang === lang || (!h.targetLang && lang === 'it'));
        }
        return allHistory;
    } catch (e) { return []; }
};

export const saveTranslationToHistory = (item: TranslationHistoryItem): TranslationHistoryItem[] => {
    // Load ALL history, not just filtered
    let allHistory: TranslationHistoryItem[] = [];
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        allHistory = stored ? JSON.parse(stored) : [];
    } catch (e) {}

    // Add new item to top
    const updatedAll = [item, ...allHistory].slice(0, 100); // increased limit slightly
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedAll));
    
    // Return only the filtered view for the UI to consume immediately if needed
    return updatedAll.filter(h => h.targetLang === item.targetLang);
}

export const clearAllData = (): void => {
    localStorage.clear();
};
