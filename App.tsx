
import React, { useState, useEffect, useMemo, useRef } from "react";
import { AppMode, WordItem, ContextSuggestion, TranslationHistoryItem, UserProfile, DailyStats } from "./types";
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

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.SPEAKING);
  const [inputText, setInputText] = useState("");
  const [words, setWords] = useState<WordItem[]>([]);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [stats, setStats] = useState<DailyStats>(getDailyStats());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'xp' | 'badge' | 'success'} | null>(null);
  
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

  // Load data on mount and when Target Language changes
  useEffect(() => {
    setWords(getWords(profile.targetLanguage));
    setHistory(getTranslationHistory(profile.targetLanguage));
    setStats(getDailyStats());
  }, [profile.targetLanguage]);

  // Robust Profile Update
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
          // Dynamic Voice Language
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

  const normalizeText = (text: string) => text.toLowerCase().replace(/[.,?!;:()]/g, '').trim();

  const getLevenshteinDistance = (a: string, b: string) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
        else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
    return matrix[b.length][a.length];
  };

  function validateAiAnalysis(rawInput: string, aiResponse: any[]) {
    const lowerInput = rawInput.toLowerCase();
    return aiResponse.map(item => {
      // If AI claims a word exists but it's not in the input string -> Hallucination.
      if (item.inputMatch && !lowerInput.includes(item.inputMatch.toLowerCase())) {
        console.warn(`⚠️ Correcting Hallucination: ${item.inputMatch}`);
        return { ...item, status: 'gap', inputMatch: '???' };
      }
      return item;
    });
  }

  const handleTranslate = async (textOverride?: string) => {
    const textToTranslate = textOverride || inputText;
    if (!textToTranslate.trim()) return;

    // Energy Check
    if (stats.energyUsed >= ENERGY_LIMIT) {
        setShowPro(true);
        return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await translateText(textToTranslate, mode, profile.targetLanguage);
      
      const aiVocab = result.vocabulary || [];
      const userTokens = normalizeText(textToTranslate).split(/\s+/);

      const validatedVocab = validateAiAnalysis(textToTranslate, aiVocab);

      const finalVocabToSave = validatedVocab.map(item => {
          // Trust the AI's status first, but allow for logic override if needed later.
          // For now, we use the validated status (which might have been downgraded to 'gap').
          
          let status = item.status || 'lookup';
          let matchType = item.matchType || 'none';

          // Override for Listening Mode (if needed)
          if (mode === AppMode.LISTENING) {
             status = 'win'; matchType = 'exposure';
          }

          return { ...item, status, matchType };
      });

      if (finalVocabToSave.length > 0) {
        const newW = saveVocabulary(finalVocabToSave, profile.targetLanguage);
        setWords(newW);
      }

      const historyItem: TranslationHistoryItem = {
          ...result, vocabulary: finalVocabToSave, id: Date.now().toString(), timestamp: Date.now(), mode: mode, targetLang: profile.targetLanguage
      };
      const updatedHistory = saveTranslationToHistory(historyItem);
      setHistory(updatedHistory);
      setInputText(""); 

      // Stats & Energy
      const newStats = consumeEnergy();
      setStats(newStats);

      // XP & Badges
      const xpGained = 10 + (finalVocabToSave.filter(v => v.status === 'win').length * 5);
      const newProfile = addXP(xpGained);
      setProfile(newProfile);
      setToast({ message: `+${xpGained} XP`, type: 'xp' });

      const { profile: badgedProfile, newBadges } = checkBadges(words, updatedHistory.length, newStats.streak);
      if (newBadges.length > 0) {
          updateProfile(badgedProfile);
          setTimeout(() => setToast({ message: `Unlocked: ${newBadges[0].name}!`, type: 'badge' }), 1500);
      }

    } catch (err) {
        console.error(err);
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

  const themeColor = mode === AppMode.SPEAKING ? "orange" : "teal";
  const latestItem = history.length > 0 ? history[0] : null;
  const archiveItems = history.length > 1 ? history.slice(1) : [];
  const visibleArchive = showAllHistory ? archiveItems : archiveItems.slice(0, 5);

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-20 font-sans selection:bg-orange-500/30">
      
      {toast && (
          <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[200] px-6 py-3 rounded-full shadow-2xl border flex items-center gap-3 animate-fade-in-up font-bold ${toast.type === 'badge' ? 'bg-teal-900/90 border-teal-500 text-teal-200' : 'bg-orange-600/90 border-orange-400 text-white'}`}>
              <i className={`fas ${toast.type === 'badge' ? 'fa-medal' : 'fa-star'}`}></i>
              {toast.message}
          </div>
      )}

      <DatabaseModal isOpen={showDatabase} onClose={() => setShowDatabase(false)} words={words} onSelect={setInputText} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onReset={handleReset} profile={profile} onUpdateProfile={updateProfile} />
      <ProModal isOpen={showPro} onClose={() => setShowPro(false)} lang={profile.uiLanguage} />

      <header className={`sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 pt-2 px-4 pb-1`}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm relative cursor-pointer" onClick={() => setShowSettings(true)}>
                     {profile.avatar}
                     <div className="absolute -bottom-1 -right-1 bg-orange-600 text-white text-[8px] font-bold px-1 rounded-full border border-black">{profile.level}</div>
                 </div>
                 <div className="flex flex-col">
                     <h1 className="text-lg font-extrabold tracking-tight text-zinc-100 leading-none">AmiGo</h1>
                     <div className="flex gap-2 mt-0.5">
                         <div className="flex items-center gap-1 text-[9px] text-yellow-500">
                             <i className="fas fa-bolt"></i> {ENERGY_LIMIT - stats.energyUsed}
                         </div>
                         <div className="flex items-center gap-1 text-[9px] text-red-500">
                             <i className="fas fa-fire"></i> {stats.streak}
                         </div>
                     </div>
                 </div>
             </div>

            <div className="flex gap-4">
                <button onClick={() => setShowDatabase(true)} className="text-zinc-500 hover:text-teal-400 transition-colors text-sm">
                    <i className="fas fa-book"></i>
                </button>
                <button onClick={() => setShowSettings(true)} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
                    <i className="fas fa-cog"></i>
                </button>
            </div>
          </div>
          <ModeSwitch mode={mode} setMode={setMode} />
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 pt-4">
        <div className="mb-6 overflow-x-auto no-scrollbar flex gap-2 items-center py-1">
            <button onClick={handleLocate} disabled={locating} className="flex-shrink-0 bg-blue-900/30 text-blue-400 px-3 py-1.5 rounded-md text-xs font-bold border border-blue-900/50">
                {locating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                {placeName ? ` ${placeName}` : ` ${t.locate}`}
            </button>
            {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInputText(s.phrase)} className="flex-shrink-0 bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-md text-xs whitespace-nowrap active:bg-zinc-800">
                    {s.phrase} <span className="text-zinc-700">|</span> {s.translation}
                </button>
            ))}
        </div>

        <section className="mb-6 relative group">
            <div className={`relative rounded-2xl bg-zinc-900 border-2 border-zinc-800 focus-within:border-${themeColor}-500 transition-colors duration-300`}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="w-full p-4 pr-12 text-base outline-none resize-none min-h-[110px] bg-transparent text-white placeholder-zinc-600"
              spellCheck={false}
            />
            <button onClick={toggleListening} className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-500'}`}>
                <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
            <div className="flex justify-between items-center p-2 bg-zinc-900/50 border-t border-zinc-800 rounded-b-2xl">
               <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-2">
                   {mode === AppMode.SPEAKING ? `CZ → ${profile.targetLanguage.toUpperCase()}` : `${profile.targetLanguage.toUpperCase()} → CZ`}
               </span>
              <button
                onClick={() => handleTranslate()}
                disabled={loading || !inputText.trim()}
                className={`px-5 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-black/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${mode === AppMode.SPEAKING ? 'bg-orange-600 hover:bg-orange-500' : 'bg-teal-600 hover:bg-teal-500'}`}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-arrow-right"></i>}
              </button>
            </div>
          </div>
        </section>

        {error && <div className="bg-red-900/20 text-red-400 p-3 text-sm rounded-lg mb-6 border border-red-900/50 flex items-center"><i className="fas fa-exclamation-triangle mr-2"></i>{error}</div>}

        {latestItem && <section className="mb-10 animate-fade-in-up"><TranslationCard item={latestItem} variant="hero" /></section>}

        <section className="mb-12">
          <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
             <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-fire text-orange-600"></i> {t.criticalFocus}</h2>
             <span className="text-zinc-700 text-[10px] font-mono">{top10.length} {t.wordsStored}</span>
          </div>
          {words.filter(w => w.count > 0).length === 0 ? (
            <div className="text-center py-8 text-zinc-700 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800/50"><i className="fas fa-check-circle text-2xl mb-2 text-teal-900"></i><p className="text-xs">{t.allClear}</p></div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-8">{top10.map((item) => (<WordChip key={item.word} item={item} maxCount={maxCount} onSelect={(text) => setInputText(text)} variant="standard" />))}</div>
              {next50.length > 0 && (
                <>
                   <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2"><h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{t.recentArchive}</h3><button onClick={() => setShowDatabase(true)} className="text-[10px] text-teal-600 hover:text-teal-400 transition-colors">{t.viewAll}</button></div>
                   <div className="flex flex-wrap gap-1.5">{next50.map((item) => (<WordChip key={item.word} item={item} maxCount={maxCount} onSelect={(text) => setInputText(text)} variant="compact"/>))}</div>
                </>
              )}
            </>
          )}
        </section>

        {archiveItems.length > 0 && (
          <section className="border-t border-zinc-900 pt-6">
             <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-4 pl-1">{t.history}</h3>
             <div className="space-y-3">{visibleArchive.map((item) => (<TranslationCard key={item.id} item={item} variant="compact" />))}</div>
             {archiveItems.length > 5 && (
                 <button onClick={() => setShowAllHistory(!showAllHistory)} className="w-full mt-4 py-3 text-xs text-zinc-500 hover:text-zinc-300 font-bold uppercase tracking-wider bg-zinc-900/30 rounded-lg hover:bg-zinc-900 transition-colors">
                    {showAllHistory ? "Show Less" : `${t.loadMore} (${archiveItems.length - 5})`}
                 </button>
             )}
          </section>
        )}
      </main>
    </div>
  );
};
export default App;
