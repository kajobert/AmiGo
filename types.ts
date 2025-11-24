
export enum AppMode {
  SPEAKING = 'SPEAKING', // CZ -> IT
  LISTENING = 'LISTENING', // IT -> CZ
}

export type TargetLanguage = 'it' | 'es' | 'fr' | 'de';
export type UILanguage = 'en' | 'cs' | 'it';
export type Theme = 'dark' | 'light';

export interface VocabularyItem {
  // Core data from AI
  word: string;         // Lemma (e.g. "Stare")
  originalForm: string; // Inflected (e.g. "Stai")
  translation: string;  // Native (e.g. "Jsi")
  phonetics?: string;    // informational only

  // Calculated on Client
  status?: 'win' | 'lookup'; 
  matchType?: 'exact' | 'phonetic' | 'none'; 
  similarity?: number;  // 0-100 score
  inputMatch?: string;  // The substring from user input used for matching
}

export interface TranslationResult {
  original: string;
  translation: string;
  czechDefinition: string; 
  phonetics?: string | null; 
  detectedLanguage?: string;
  isNonsense?: boolean; 
  vocabulary?: VocabularyItem[];
}

export interface TranslationHistoryItem extends TranslationResult {
  id: string;
  timestamp: number;
  mode: AppMode;
  targetLang: TargetLanguage;
}

export interface WordItem {
  word: string;
  language: TargetLanguage; 
  usedForms: string[]; 
  translation?: string;
  phonetics?: string;
  count: number; 
  lookups: number; 
  wins: number; 
  lastUsed: number;
}

export interface ContextSuggestion {
  phrase: string;
  translation: string;
  phonetics: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
  dateUnlocked?: number;
}

export interface UserProfile {
  name: string;
  avatar: string;
  xp: number;
  level: number;
  badges: Badge[];
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  theme: Theme;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  energyUsed: number;
  streak: number;
  lastStreakDate: string;
}
