
import React, { useState, useEffect, useMemo, useRef } from "react";
import { AppMode, WordItem, ContextSuggestion, TranslationHistoryItem, UserProfile, DailyStats, VocabularyItem } from "./types";
import { translateText, getContextSuggestions } from "./services/geminiService";
import { 
    getWords, saveVocabulary, clearAllData, 
    getTranslationHistory, saveTranslationToHistory, 
    getUserProfile, saveUserProfile, addXP, checkBadges,
    getDailyStats, consumeEnergy
} from "./services/storageService";
import { UI_STRINGS } from "./translations";
import { ModeSwitch } from "./components/ModeSwitch";
import { WordChip } from "./components/HistoryCard";
import { DatabaseModal } from "./components/DatabaseModal";
import { SettingsModal } from "./components/SettingsModal";
import { TranslationCard } from "./components/TranslationCard";
import { ProModal } from "./components/ProModal";
import { motion, AnimatePresence } from "framer-motion";

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.SPEAKING);
  const [inputText, setInputText] = useState("");
  const [words, setWords] = useState<WordItem[]>([]);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [stats, setStats] = useState<DailyStats>(getDailyStats());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'xp' | 'badge' | 'success' | 'error'} | null>(null);
  
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [locating, setLocating] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ContextSuggestion[]>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [showDatabase, setShowDatabase] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPro, setShowPro] = useState(false);

  const ENERGY_LIMIT = 20;
  const t = UI_STRINGS[profile.uiLanguage];

  useEffect(() => {
    const root = document.documentElement;
    if (profile.theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light-theme');
    } else {
      root.classList.remove('dark');
      root.classList.add('light-theme');
    }
  }, [profile.theme]);

  useEffect(() => {
    setWords(getWords(profile.targetLanguage));
    setHistory(getTranslationHistory(profile.targetLanguage));
    setStats(getDailyStats());
  }, [profile.targetLanguage]);

  const updateProfile = (newProfile: UserProfile) => {
      setProfile(newProfile);
      saveUserProfile(newProfile);
  };

  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            setInputText(event.results[0][0].transcript);
            setIsListening(false);
        };
        recognitionRef.current.onerror = () => setIsListening(false);
        recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
      if (!recognitionRef.current) return;
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          const targetCodes = { it: 'it-IT', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' };
          recognitionRef.current.lang = mode === AppMode.SPEAKING ? 'cs-CZ' : targetCodes[profile.targetLanguage];
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const handleLocate = () => {
      if (!navigator.geolocation) return;
      setLocating(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const data = await getContextSuggestions(latitude, longitude, profile.targetLanguage);
          setPlaceName(data.place);
          setSuggestions(data.suggestions);
          setLocating(false);
      }, () => setLocating(false));
  };

  // --- PHONETIC SKELETON ALGORITHM ---

  const getLevenshteinDistance = (a: string, b: string) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
                );
            }
        }
    }
    return matrix[b.length][a.length];
  };

  // Create a "Phonetic Skeleton" to bridge Italian/Czech orthography
  // E.g., "Seňora" -> "senora" (skeleton: snra)
  //       "Signora" -> "sinyora" (skeleton: snra)
  const getPhoneticSkeleton = (text: string) => {
      let s = text.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
        .trim();
      
      // 1. Map complex Italian sounds to simple base
      s = s.replace(/gli/g, "li");
      s = s.replace(/gn/g, "n"); 
      s = s.replace(/sci/g, "si");
      s = s.replace(/sce/g, "se");
      s = s.replace(/chi/g, "k");
      s = s.replace(/che/g, "k");
      
      // 2. Map Czech sounds to simple base
      s = s.replace(/ň/g, "n");
      s = s.replace(/š/g, "s");
      s = s.replace(/č/g, "c");
      s = s.replace(/ř/g, "r");
      s = s.replace(/ž/g, "z");
      s = s.replace(/ď/g, "d");
      s = s.replace(/ť/g, "t");
      
      // 3. Unify confusables
      s = s.replace(/j/g, "i");
      s = s.replace(/y/g, "i");
      s = s.replace(/w/g, "v");
      s = s.replace(/q/g, "k");
      s = s.replace(/x/g, "ks");
      
      // 4. Remove double letters
      s = s.replace(/(.)\1+/g, "$1");

      // 5. Final strip
      s = s.replace(/[^a-z0-9]/g, "");
      
      return s;
  };

  // Sliding Window over Skeleton
  const calculateMatchScore = (rawInput: string, rawTarget: string): number => {
      const skelInput = getPhoneticSkeleton(rawInput);
      const skelTarget = getPhoneticSkeleton(rawTarget);
      
      if (!skelTarget) return 0;
      
      // Shortcut for inclusion
      if (skelInput.includes(skelTarget)) return 100;

      const windowSize = skelTarget.length;
      let minDistance = Infinity;

      // Scan through input
      for (let i = 0; i <= skelInput.length - windowSize + 1; i++) {
          // Check windows of varying size to account for missing/extra chars
          for (let offset = -1; offset <= 1; offset++) {
             const len = windowSize + offset;
             if (len < 1) continue;
             if (i + len > skelInput.length) continue;
             
             const sub = skelInput.substring(i, i + len);
             const dist = getLevenshteinDistance(sub, skelTarget);
             if (dist < minDistance) minDistance = dist;
          }
      }
      
      // Calculate Similarity Score (0-100)
      // Allow error tolerance proportional to length
      const maxLen = Math.max(skelTarget.length, 1);
      const similarity = Math.max(0, 100 - ((minDistance / maxLen) * 100));
      
      return Math.round(similarity);
  };

  const processVocabulary = (rawInput: string, vocabList: VocabularyItem[]): VocabularyItem[] => {
      return vocabList.map(item => {
          // Compare input vs Target Word (originalForm)
          const score = calculateMatchScore(rawInput, item.originalForm);
          
          let status: 'win' | 'lookup' = 'lookup';
          let matchType: 'exact' | 'phonetic' | 'none' = 'none';

          if (score === 100) {
              status = 'win';
              matchType = 'exact';
          } else if (score >= 65) {
              status = 'win';
              matchType = 'phonetic';
          }

          return { ...item, status, matchType, similarity: score };
      });
  };

  const handleTranslate = async (textOverride?: string) => {
    const textToTranslate = textOverride || inputText;
    if (!textToTranslate.trim()) return;

    if (stats.energyUsed >= ENERGY_LIMIT) { setShowPro(true); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await translateText(textToTranslate, mode, profile.targetLanguage);
      
      if (result.isNonsense) {
          setToast({ message: t.gibberish, type: 'error' });
          setLoading(false);
          return;
      }

      // Calculate Scores locally based on skeletons
      const processedVocab = processVocabulary(textToTranslate, result.vocabulary || []);
      
      if (processedVocab.length > 0) {
        const newW = saveVocabulary(processedVocab, profile.targetLanguage);
        setWords(newW);
      }

      const historyItem: TranslationHistoryItem = {
          ...result, 
          vocabulary: processedVocab, 
          id: Date.now().toString(), 
          timestamp: Date.now(), 
          mode: mode, 
          targetLang: profile.targetLanguage
      };
      
      const updatedHistory = saveTranslationToHistory(historyItem);
      setHistory(updatedHistory);
      setInputText(""); 

      const newStats = consumeEnergy();
      setStats(newStats);

      const xpGained = 10 + (processedVocab.filter(v => v.status === 'win').length * 5);
      const newProfile = addXP(xpGained);
      setProfile(newProfile);
      setToast({ message: `+${xpGained} XP`, type: 'xp' });

      const { profile: badgedProfile, newBadges } = checkBadges(words, updatedHistory.length, newStats.streak);
      if (newBadges.length > 0) {
          updateProfile(badgedProfile);
          setTimeout(() => setToast({ message: `Unlocked: ${newBadges[0].name}!`, type: 'badge' }), 1500);
      }

    } catch (err) {
        setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
      clearAllData();
      setWords([]);
      setHistory([]);
      setProfile(getUserProfile());
      setStats(getDailyStats());
  };

  const { top10, next50, maxCount } = useMemo(() => {
    const activeWords = words.filter(w => w.count > 0);
    const sorted = [...activeWords].sort((a, b) => b.count - a.count);
    const t10 = sorted.slice(0, 10);
    const n50 = sorted.slice(10, 60);
    const mc = t10.length > 0 ? t10[0].count : 1;
    return { top10: t10, next50: n50, maxCount: mc };
  }, [words]);

  const latestItem = history.length > 0 ? history[0] : null;
  const archiveItems = history.length > 1 ? history.slice(1) : [];
  const visibleArchive = showAllHistory ? archiveItems : archiveItems.slice(0, 5);
  const themeColor = mode === AppMode.SPEAKING ? "orange" : "teal";

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden selection:bg-orange-500/30">
      
      <AnimatePresence>
      {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 left-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl border flex items-center gap-3 font-bold backdrop-blur-md whitespace-nowrap 
                ${toast.type === 'badge' ? 'bg-teal-900/80 border-teal-500 text-teal-200' : 
                  toast.type === 'error' ? 'bg-red-600/80 border-red-400 text-white' : 
                  'bg-orange-600/80 border-orange-400 text-white'}`}
          >
              <i className={`fas ${toast.type === 'badge' ? 'fa-medal' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-star'}`}></i>
              {toast.message}
          </motion.div>
      )}
      </AnimatePresence>

      <DatabaseModal isOpen={showDatabase} onClose={() => setShowDatabase(false)} words={words} onSelect={setInputText} profile={profile} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onReset={handleReset} profile={profile} onUpdateProfile={updateProfile} />
      <ProModal isOpen={showPro} onClose={() => setShowPro(false)} lang={profile.uiLanguage} />

      <header className={`sticky top-0 z-40 bg-white/80 dark:bg-black/50 backdrop-blur-xl border-b pt-2 px-4 pb-1 transition-colors border-zinc-200 dark:border-white/5`}>
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-3">
                 <div onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-white/10 dark:to-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center text-lg relative cursor-pointer shadow-lg">
                     {profile.avatar}
                     <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] font-bold px-1.5 rounded-full shadow-sm">{profile.level}</div>
                 </div>
                 <div className="flex flex-col">
                     <h1 className="text-xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-zinc-800 to-zinc-600 dark:from-zinc-200 dark:to-zinc-500">AmiGo</h1>
                     <div className="flex gap-3 mt-1">
                         <div className="flex items-center gap-1 text-[9px] font-bold text-yellow-600 dark:text-yellow-500/90">
                             <i className="fas fa-bolt"></i> {ENERGY_LIMIT - stats.energyUsed}
                         </div>
                         <div className="flex items-center gap-1 text-[9px] font-bold text-red-600 dark:text-red-500/90">
                             <i className="fas fa-fire"></i> {stats.streak}
                         </div>
                     </div>
                 </div>
             </div>

            <div className="flex gap-2">
                <button onClick={() => setShowDatabase(true)} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                    <i className="fas fa-book opacity-60 text-zinc-700 dark:text-zinc-200"></i>
                </button>
                <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                    <i className="fas fa-cog opacity-60 text-zinc-700 dark:text-zinc-200"></i>
                </button>
            </div>
          </div>
          <ModeSwitch mode={mode} setMode={setMode} />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-4">
        
        {/* Context Bar */}
        <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button onClick={handleLocate} disabled={locating} className="flex-shrink-0 bg-blue-500/10 text-blue-500 dark:text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-500/20 active:scale-95 transition-transform">
                {locating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                {placeName ? ` ${placeName}` : ` ${t.locate}`}
            </button>
            {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInputText(s.phrase)} className="flex-shrink-0 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap active:bg-black/10 dark:active:bg-white/10 opacity-70 text-zinc-700 dark:text-zinc-300 shadow-sm">
                    {s.phrase}
                </button>
            ))}
        </div>

        {/* Input Area */}
        <section className="mb-6 relative z-10">
            <div className={`relative rounded-3xl prismatic-card prismatic-border transition-all duration-500 focus-within:ring-1 focus-within:ring-${themeColor}-500/50 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10`}>
                <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t.inputPlaceholder}
                className="w-full p-4 pr-14 text-base bg-transparent border-none outline-none resize-none min-h-[100px] placeholder-zinc-400 dark:placeholder-zinc-600 text-zinc-900 dark:text-zinc-100"
                spellCheck={false}
                />
                
                <button onClick={toggleListening} className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/50' : 'bg-zinc-100 dark:bg-zinc-500/10 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}>
                    <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
                </button>

                <div className="flex justify-between items-center p-2.5 border-t border-zinc-100 dark:border-white/5 bg-zinc-50 dark:bg-white/5 rounded-b-3xl">
                    <span className="text-[10px] opacity-40 font-black tracking-[0.2em] ml-2 text-zinc-700 dark:text-zinc-300">
                        {mode === AppMode.SPEAKING ? `CZ — ${profile.targetLanguage.toUpperCase()}` : `${profile.targetLanguage.toUpperCase()} — CZ`}
                    </span>
                    <button
                        onClick={() => handleTranslate()}
                        disabled={loading || !inputText.trim()}
                        className={`px-5 py-2 rounded-xl text-sm font-bold text-white shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${mode === AppMode.SPEAKING ? 'bg-gradient-to-r from-orange-600 to-red-600' : 'bg-gradient-to-r from-teal-600 to-emerald-600'}`}
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-arrow-right"></i>}
                    </button>
                </div>
            </div>
        </section>

        {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-xl mb-6 border border-red-500/20 text-sm flex items-center gap-2"><i className="fas fa-bug"></i> {error}</div>}

        <AnimatePresence>
            {latestItem && <TranslationCard key={latestItem.id} item={latestItem} variant="hero" />}
        </AnimatePresence>

        {/* Vocabulary Heatmap */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-200 dark:border-white/5 pb-2">
             <h2 className="text-[10px] font-black opacity-50 uppercase tracking-widest flex items-center gap-2 text-zinc-600 dark:text-zinc-400"><i className="fas fa-fire text-orange-500"></i> {t.criticalFocus}</h2>
             <span className="text-[10px] font-mono opacity-30 text-zinc-600 dark:text-zinc-400">{top10.length} {t.wordsStored}</span>
          </div>
          
          {words.filter(w => w.count > 0).length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-white/5 rounded-2xl opacity-50">
                <i className="fas fa-check-circle text-3xl mb-2 text-teal-500/50"></i>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.allClear}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-8">
                  <AnimatePresence>
                    {top10.map((item) => (
                        <motion.div layout key={item.word} initial={{opacity:0, scale:0.8}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.5}}>
                            <WordChip item={item} maxCount={maxCount} onSelect={(text) => setInputText(text)} variant="standard" />
                        </motion.div>
                    ))}
                  </AnimatePresence>
              </div>
              
              {next50.length > 0 && (
                <>
                   <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-white/5 pb-2">
                       <h3 className="text-[10px] font-black opacity-40 uppercase tracking-widest text-zinc-600 dark:text-zinc-400">{t.recentArchive}</h3>
                       <button onClick={() => setShowDatabase(true)} className="text-[10px] text-teal-500 hover:text-teal-400 font-bold">{t.viewAll}</button>
                   </div>
                   <div className="flex flex-wrap gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                       {next50.map((item) => (<WordChip key={item.word} item={item} maxCount={maxCount} onSelect={(text) => setInputText(text)} variant="compact"/>))}
                   </div>
                </>
              )}
            </>
          )}
        </section>

        {/* History Feed */}
        {archiveItems.length > 0 && (
          <section className="pt-6 border-t border-zinc-200 dark:border-white/5">
             <h3 className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-4 text-zinc-600 dark:text-zinc-400">{t.history}</h3>
             <div className="space-y-3">
                 {visibleArchive.map((item) => (<TranslationCard key={item.id} item={item} variant="compact" />))}
             </div>
             {archiveItems.length > 5 && (
                 <button onClick={() => setShowAllHistory(!showAllHistory)} className="w-full mt-6 py-3 text-xs font-bold uppercase tracking-wider bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-xl transition-colors text-zinc-700 dark:text-zinc-300">
                    {showAllHistory ? "Show Less" : `${t.loadMore}`}
                 </button>
             )}
          </section>
        )}
      </main>
    </div>
  );
};
export default App;
