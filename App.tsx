
import React, { useState, useEffect, useMemo, useRef } from "react";
import { AppMode, WordItem, FutureRoadmap, ContextSuggestion, VocabularyItem } from "./types";
import { translateText, getContextSuggestions } from "./services/geminiService";
import { getWords, saveVocabulary, clearHistory } from "./services/storageService";
import { ModeSwitch } from "./components/ModeSwitch";
import { WordChip } from "./components/HistoryCard";
import { DatabaseModal } from "./components/DatabaseModal";

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.SPEAKING);
  const [inputText, setInputText] = useState("");
  const [words, setWords] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Translation Result State
  const [resultText, setResultText] = useState<string | null>(null);
  const [resultPhonetics, setResultPhonetics] = useState<string | null>(null);
  const [resultOriginal, setResultOriginal] = useState<string | null>(null);
  
  // Processed Vocabulary for the Result View
  const [processedVocab, setProcessedVocab] = useState<VocabularyItem[]>([]);

  // Context State
  const [locating, setLocating] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ContextSuggestion[]>([]);

  // Voice State
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Modal State
  const [showDatabase, setShowDatabase] = useState(false);

  // Load words on mount
  useEffect(() => {
    setWords(getWords());
  }, []);

  // Setup Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
            setError("Voice input failed: " + event.error);
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }
  }, []);

  const toggleListening = () => {
      if (!recognitionRef.current) {
          setError("Voice input not supported in this browser.");
          return;
      }
      if (isListening) {
          recognitionRef.current.stop();
      } else {
          setError(null);
          recognitionRef.current.lang = mode === AppMode.SPEAKING ? 'cs-CZ' : 'it-IT';
          recognitionRef.current.start();
          setIsListening(true);
      }
  };

  const speakText = (text: string) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      window.speechSynthesis.speak(utterance);
  };

  const handleLocate = () => {
      if (!navigator.geolocation) {
          setError("Geolocation not supported");
          return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
          const { latitude, longitude } = position.coords;
          const data = await getContextSuggestions(latitude, longitude);
          setPlaceName(data.place);
          setSuggestions(data.suggestions);
          setLocating(false);
      }, (err) => {
          setLocating(false);
          setError("Location access denied or failed.");
      });
  };

  // Helper to clean text for comparison
  const normalizeText = (text: string) => {
    return text.toLowerCase()
      .replace(/[.,?!;:()]/g, '') // remove punctuation
      .trim();
  };

  // Levenshtein distance for fuzzy matching (Offline logic)
  const getLevenshteinDistance = (a: string, b: string) => {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) == a.charAt(j - 1)) {
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

  const handleTranslate = async (textOverride?: string) => {
    const textToTranslate = textOverride || inputText;
    if (!textToTranslate.trim()) return;

    setLoading(true);
    setError(null);
    setResultText(null);
    setResultPhonetics(null);
    setProcessedVocab([]);

    try {
      // 1. Get AI Translation & Extracted Vocabulary with Input Matches
      const result = await translateText(textToTranslate, mode);
      
      setResultOriginal(result.original);
      setResultText(result.translation);
      setResultPhonetics(result.phonetics || null);

      // 2. OFFLINE COMPARATOR LOGIC (Fuzzy & Exact)
      const aiVocab = result.vocabulary || [];
      const userTokens = normalizeText(textToTranslate).split(/\s+/);

      const finalVocabToSave = aiVocab.map(item => {
          const normalizedInputMatch = normalizeText(item.inputMatch);
          const normalizedOriginal = normalizeText(item.originalForm);
          const normalizedLemma = normalizeText(item.word);
          
          let status: 'win' | 'lookup' = 'lookup';
          let matchType = 'none';

          if (mode === AppMode.LISTENING) {
             status = 'win';
             matchType = 'exposure';
          } else {
             // SPEAKING MODE:
             // Check 1: Exact Token Match (Did user type the exact Italian word?)
             // We check userTokens (all words in input) against the Italian form
             const exactMatch = userTokens.includes(normalizedOriginal) || userTokens.includes(normalizedLemma);

             if (exactMatch) {
                 status = 'win';
                 matchType = 'exact';
             } else {
                 // Check 2: Fuzzy/Phonetic Match
                 // Compare what user typed (inputMatch) vs what it should be (originalForm)
                 // Example: User "kvatro" vs Italian "quattro"
                 const dist = getLevenshteinDistance(normalizedInputMatch, normalizedOriginal);
                 const maxLength = Math.max(normalizedInputMatch.length, normalizedOriginal.length);
                 const similarity = 1 - (dist / maxLength);
                 
                 // If similarity is > 50% (arbitrary threshold for "good attempt")
                 // And the words aren't empty
                 if (maxLength > 0 && similarity > 0.5) {
                     status = 'win';
                     matchType = 'phonetic';
                 } else {
                     status = 'lookup'; // Too different, likely a Czech word translated
                 }
             }
          }

          return { ...item, status, matchType };
      });

      setProcessedVocab(finalVocabToSave);

      // 3. Save to Storage
      if (finalVocabToSave.length > 0) {
        const updatedWords = saveVocabulary(finalVocabToSave);
        setWords(updatedWords);
      }
      
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unexpected error occurred.");
        }
    } finally {
      setLoading(false);
    }
  };

  const { top10, next50, maxCount } = useMemo(() => {
    const activeWords = words.filter(w => w.count > 0);
    const sorted = [...activeWords].sort((a, b) => b.count - a.count);
    
    const top10 = sorted.slice(0, 10);
    const next50 = sorted.slice(10, 60);
    const maxCount = top10.length > 0 ? top10[0].count : 1;
    return { top10, next50, maxCount };
  }, [words]);

  const themeColor = mode === AppMode.SPEAKING ? "orange" : "teal";

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-20 font-sans">
      
      <DatabaseModal 
        isOpen={showDatabase} 
        onClose={() => setShowDatabase(false)} 
        words={words}
        onSelect={setInputText}
      />

      {/* Compact Header */}
      <header className={`sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800 pt-2 px-4 pb-1`}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-extrabold tracking-tight text-zinc-100 flex items-center gap-2">
              Il Vicino <span className="text-zinc-600 font-normal text-xs tracking-wide">| The Neighbor</span>
            </h1>
            <div className="flex gap-4">
                <button 
                    onClick={() => setShowDatabase(true)}
                    className="text-zinc-500 hover:text-teal-400 transition-colors text-sm"
                    title="Database"
                >
                    <i className="fas fa-book"></i>
                </button>
                <button 
                onClick={() => { if(confirm("Reset all vocabulary statistics?")) { clearHistory(); setWords([]); } }}
                className="text-zinc-600 hover:text-red-500 transition-colors text-sm"
                title="Clear History"
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>
          </div>
          <ModeSwitch mode={mode} setMode={setMode} />
        </div>
      </header>

      <main className="max-w-md mx-auto px-3 pt-4">
        {/* Context Aware Bar */}
        <div className="mb-6 overflow-x-auto no-scrollbar flex gap-2 items-center py-1">
            <button 
                onClick={handleLocate}
                disabled={locating}
                className="flex-shrink-0 bg-blue-900/30 text-blue-400 px-3 py-1.5 rounded-md text-xs font-bold border border-blue-900/50 active:scale-95 transition-transform"
            >
                {locating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-map-marker-alt"></i>}
                {placeName ? ` ${placeName}` : " Locate Me"}
            </button>
            {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInputText(s.phrase)} className="flex-shrink-0 bg-zinc-900 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-md text-xs whitespace-nowrap active:bg-zinc-800 hover:border-zinc-600 transition-colors">
                    {s.phrase} <span className="text-zinc-700">|</span> {s.translation}
                </button>
            ))}
        </div>

        {/* Input Area */}
        <section className="mb-6 relative group">
            <div className={`relative rounded-2xl bg-zinc-900 border-2 border-zinc-800 focus-within:border-${themeColor}-500 transition-colors duration-300`}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={mode === AppMode.SPEAKING ? "Jak se řekne... (nebo napiš italsky)" : "Scrivi in italiano..."}
              className="w-full p-4 pr-12 text-base outline-none resize-none min-h-[110px] bg-transparent text-white placeholder-zinc-600"
              spellCheck={false}
            />
            
            {/* Mic Button inside Input */}
            <button 
                onClick={toggleListening}
                className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
            >
                <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>

            <div className="flex justify-between items-center p-2 bg-zinc-900/50 border-t border-zinc-800 rounded-b-2xl">
               <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest ml-2">
                   {mode === AppMode.SPEAKING ? 'CZ → IT' : 'IT → CZ'}
               </span>
              <button
                onClick={() => handleTranslate()}
                disabled={loading || !inputText.trim()}
                className={`
                  px-5 py-2 rounded-lg text-sm font-bold text-white shadow-lg shadow-black/50 transform active:scale-95 transition-all 
                  flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                  ${mode === AppMode.SPEAKING ? 'bg-orange-600 hover:bg-orange-500' : 'bg-teal-600 hover:bg-teal-500'}
                `}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-arrow-right"></i>}
              </button>
            </div>
          </div>
        </section>

        {/* Result Display */}
        {resultText && (
          <section className="mb-10 animate-fade-in-up">
            <div className={`bg-zinc-900 p-5 rounded-xl border-l-2 ${mode === AppMode.SPEAKING ? 'border-orange-500' : 'border-teal-500'}`}>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="text-2xl font-bold text-white mb-2 leading-tight">
                        {resultText}
                        </div>
                        {resultPhonetics && (
                        <div className="text-sm text-zinc-400 font-mono bg-black/40 inline-block px-2 py-1 rounded mb-3 border border-zinc-800/50">
                            /{resultPhonetics}/
                        </div>
                        )}
                        
                        {/* Processed Vocabulary Feedback */}
                        {processedVocab.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {processedVocab.map((v, idx) => {
                                    let iconClass = "fa-search";
                                    let colorClass = "bg-orange-900/30 border-orange-700 text-orange-300";
                                    
                                    // Custom Logic for Feedback Display
                                    // @ts-ignore - augmenting type for local logic
                                    const mType = v.matchType || 'none';

                                    if (v.status === 'win') {
                                        colorClass = "bg-teal-900/30 border-teal-700 text-teal-300";
                                        if (mType === 'phonetic') {
                                            iconClass = "fa-ear-listen"; // Phonetic Match
                                        } else {
                                            iconClass = "fa-check"; // Exact Match
                                        }
                                    }

                                    return (
                                        <span 
                                            key={idx} 
                                            className={`text-[10px] px-2 py-1 rounded border font-bold ${colorClass}`}
                                            title={mType === 'phonetic' ? `Phonetic approximation: ${v.inputMatch}` : ''}
                                        >
                                            <i className={`fas ${iconClass} mr-1`}></i>
                                            {v.word}
                                        </span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={() => speakText(resultText)}
                        className={`p-3 rounded-full bg-zinc-800 ${mode === AppMode.SPEAKING ? 'text-orange-500' : 'text-teal-500'} hover:bg-zinc-700 transition-colors ml-4`}
                    >
                        <i className="fas fa-volume-up text-lg"></i>
                    </button>
                </div>
                <div className="text-zinc-600 italic text-xs border-t border-zinc-800 pt-3 mt-2">
                   Original: "{resultOriginal}"
                </div>
            </div>
          </section>
        )}

        {error && (
          <div className="bg-red-900/20 text-red-400 p-3 text-sm rounded-lg mb-6 border border-red-900/50 flex items-center">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {error}
          </div>
        )}

        {/* Word Heatmap Section */}
        <section>
          {/* Section Header */}
          <div className="flex items-center justify-between mb-4 border-b border-zinc-900 pb-2">
             <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-fire text-orange-600"></i> Critical Focus
             </h2>
             <span className="text-zinc-700 text-[10px] font-mono">{top10.length} words</span>
          </div>
          
          {words.filter(w => w.count > 0).length === 0 ? (
            <div className="text-center py-12 text-zinc-700 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
              <i className="fas fa-check-circle text-3xl mb-3 text-teal-800"></i>
              <p className="text-sm">All clear! You are mastering everything.</p>
              <button onClick={() => setShowDatabase(true)} className="mt-4 text-teal-500 text-xs font-bold uppercase">View Database</button>
            </div>
          ) : (
            <>
              {/* Top 10: Flexible Bar Layout */}
              <div className="flex flex-wrap gap-2 mb-8">
                {top10.map((item) => (
                  <WordChip 
                    key={item.word} 
                    item={item} 
                    maxCount={maxCount}
                    onSelect={(text) => setInputText(text)}
                    variant="standard" 
                  />
                ))}
              </div>

              {/* Next 50: Compact Cloud */}
              {next50.length > 0 && (
                <>
                   <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                        Recent Archive
                    </h3>
                    <button onClick={() => setShowDatabase(true)} className="text-[10px] text-teal-600 hover:text-teal-400 transition-colors">View All</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {next50.map((item) => (
                      <WordChip 
                        key={item.word} 
                        item={item} 
                        maxCount={maxCount}
                        onSelect={(text) => setInputText(text)}
                        variant="compact"
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
