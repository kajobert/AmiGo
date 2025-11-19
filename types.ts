
export enum AppMode {
  SPEAKING = 'SPEAKING', // CZ -> IT
  LISTENING = 'LISTENING', // IT -> CZ
}

export type TargetLanguage = 'it' | 'es' | 'fr' | 'de';
export type UILanguage = 'en' | 'cs' | 'it';

export interface VocabularyItem {
  word: string; 
  originalForm: string; 
  inputMatch: string; 
  translation: string;
  phonetics: string;
  status?: 'win' | 'lookup'; 
  matchType?: string; 
}

export interface TranslationResult {
  original: string;
  translation: string;
  czechDefinition: string; 
  phonetics?: string | null; 
  detectedLanguage?: string;
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
  language: TargetLanguage; // New: Filter by language
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
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  energyUsed: number;
  streak: number;
  lastStreakDate: string;
}
